import { FluxDispatcher } from "@vendetta/metro/common";
import { before as patchBefore, after as patchAfter } from "@vendetta/patcher";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";
import { showToast } from "@vendetta/ui/toasts";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRowComponent = findByProps("ActionSheetRow")?.ActionSheetRow;
const FormRow = Forms?.FormRow;
const Messages = findByProps("startEditMessage", "editMessage") ?? findByProps("sendMessage", "editMessage");

let MessageStore = null;
let ChannelStore = null;
let ChannelMessages = null;

function getMessageStore() {
    MessageStore ??= findByProps("getMessage", "getMessages") ?? findByStoreName("MessageStore");
    return MessageStore;
}

function getChannelStore() {
    ChannelStore ??= findByProps("getChannel", "getDMFromUserId") ?? findByStoreName("ChannelStore");
    return ChannelStore;
}

function getChannelMessages() {
    ChannelMessages ??= findByProps("_channelMessages");
    return ChannelMessages;
}

function getOriginalMessage(channelId, messageId) {
    const ms = getMessageStore();
    let msg = ms?.getMessage?.(channelId, messageId);
    if (!msg) {
        const cm = getChannelMessages();
        const channel = cm?.get?.(channelId) ?? cm?._channelMessages?.[channelId];
        msg = channel?.get?.(messageId) ?? channel?._array?.find?.(m => m?.id === messageId);
    }
    return msg;
}

function formatPrev(prev) {
    const clean = (typeof prev === "string" ? prev : "").trim();
    if (clean.includes("\n")) {
        const lines = clean.split("\n");
        return lines.map((line, i) => {
            if (i === 0) return `-# (prev message) "${line}`;
            if (i === lines.length - 1) return ` -# ${line}"`;
            return ` -# ${line}`;
        }).join("\n");
    }
    return `-# (prev message) "${clean}"`;
}

function extractCleanContent(content) {
    if (!content || typeof content !== "string") return "";
    let clean = content;
    const marker = "\n\n-# (prev message";
    const idx = clean.indexOf(marker);
    if (idx !== -1) {
        clean = clean.substring(0, idx);
    }
    // Strip inline (edited) indicators
    clean = clean.replace(/\s*\*\(edited\)\*$/, "").replace(/\s*\(edited\)$/, "");
    return clean.trimEnd();
}

function extractPreviousMessages(content) {
    if (!content || typeof content !== "string") return [];
    const marker = "\n\n-# (prev message";
    const idx = content.indexOf(marker);
    if (idx === -1) return [];

    const footer = content.substring(idx + 2);
    const results = [];
    const regex = /^-# \(prev message.*?\)\s*"([\s\S]*?)"(?=\n-# \(prev message|\s*$)/gm;
    let match;
    while ((match = regex.exec(footer)) !== null) {
        results.push(match[1]);
    }
    return results;
}

// In-memory edit history cache: messageId -> Array of previous messages
const editHistory = new Map();
const patches = [];

function handleMessageUpdate(args) {
    const event = args[0];
    if (event?.otherPluginBypass) return args;

    const messageData = event.message ?? event;
    const messageId = messageData?.id ?? event.id;
    const channelId = messageData?.channel_id ?? messageData?.channelId ?? event.channelId;
    if (!messageId || !channelId) return args;

    const newContent = messageData.content;
    if (typeof newContent !== "string") return args;

    const originalMessage = getOriginalMessage(channelId, messageId);
    if (!originalMessage) return args;

    const oldRawContent = originalMessage.content;
    if (typeof oldRawContent !== "string") return args;

    const cleanOld = extractCleanContent(oldRawContent);
    const cleanNew = extractCleanContent(newContent);

    let history = editHistory.get(messageId);
    if (!history) {
        history = extractPreviousMessages(oldRawContent);
        editHistory.set(messageId, history);
    }

    // If clean text is identical (e.g. gateway ACK, embed update, reaction)
    if (cleanOld === cleanNew) {
        if (history.length > 0 && !newContent.includes("\n\n-# (prev message")) {
            const prevLines = history.map(prev => formatPrev(prev)).join("\n");
            const formatted = `${cleanNew} *(edited)*\n\n${prevLines}`;
            args[0] = {
                type: "MESSAGE_UPDATE",
                channelId,
                message: {
                    ...originalMessage,
                    ...messageData,
                    content: formatted,
                    edited_timestamp: null,
                },
                otherPluginBypass: true,
            };
        }
        return args;
    }

    // New edit: push previous clean message to history
    if (cleanOld && (history.length === 0 || history[history.length - 1] !== cleanOld)) {
        history.push(cleanOld);
    }

    if (history.length > 25) {
        history.shift();
    }

    if (editHistory.size > 1000) {
        const firstKey = editHistory.keys().next().value;
        editHistory.delete(firstKey);
    }

    // Format output: (edited message) *(edited)* \n\n -# (prev message) "(original message)"
    const prevLines = history.map(prev => formatPrev(prev)).join("\n");
    const formattedContent = `${cleanNew} *(edited)*\n\n${prevLines}`;

    const cs = getChannelStore();
    const guildId = messageData.guild_id ?? originalMessage.guild_id ?? cs?.getChannel?.(channelId)?.guild_id;

    // Setting edited_timestamp: null stops Discord from appending its duplicate (edited) text at the very bottom
    args[0] = {
        type: "MESSAGE_UPDATE",
        channelId,
        message: {
            ...originalMessage,
            ...messageData,
            content: formattedContent,
            guild_id: guildId,
            edited_timestamp: null,
        },
        otherPluginBypass: true,
    };

    return args;
}

function handleLoadMessagesSuccess(args) {
    const event = args[0];
    if (!Array.isArray(event?.messages)) return args;

    for (const msg of event.messages) {
        if (!msg?.id) continue;
        const history = editHistory.get(msg.id);
        if (history && history.length > 0) {
            const clean = extractCleanContent(msg.content);
            const prevLines = history.map(prev => formatPrev(prev)).join("\n");
            msg.content = `${clean} *(edited)*\n\n${prevLines}`;
            msg.edited_timestamp = null;
        }
    }
    return args;
}

export default {
    onLoad() {
        try {
            // 1. Intercept message updates locally
            patches.push(
                patchBefore("dispatch", FluxDispatcher, (args) => {
                    try {
                        const event = args?.[0];
                        if (!event) return args;

                        if (event.type === "MESSAGE_UPDATE") {
                            return handleMessageUpdate(args);
                        } else if (event.type === "LOAD_MESSAGES_SUCCESS") {
                            return handleLoadMessagesSuccess(args);
                        }
                    } catch (err) {
                        console.error("[noEdit → dispatcher]", err);
                    }
                    return args;
                })
            );

            // 2. Fix self edit: when user edits their own message, only load the clean text into the input
            if (Messages?.startEditMessage) {
                patches.push(
                    patchBefore("startEditMessage", Messages, (args) => {
                        if (typeof args[2] === "string") {
                            args[2] = extractCleanContent(args[2]);
                        }
                        return args;
                    })
                );
            }

            // 3. Add "Clear Edit History" button to message context menu
            if (LazyActionSheet) {
                patches.push(
                    patchBefore("openLazy", LazyActionSheet, ([component, key, msg]) => {
                        const message = msg?.message;
                        if (key !== "MessageLongPressActionSheet" || !message) return;

                        component.then((instance) => {
                            const unpatch = patchAfter("default", instance, (_, res) => {
                                setTimeout(unpatch, 0);

                                const buttons = findInReactTree(res, x => x?.[0]?.type?.name === "ActionSheetRow" || x?.[0]?.type?.name === "ButtonRow");
                                if (!buttons || !Array.isArray(buttons)) return;

                                const hasHistory = editHistory.has(message.id) || (typeof message.content === "string" && message.content.includes("\n\n-# (prev message"));
                                if (!hasHistory) return;

                                if (buttons.some(b => b?.props?.label === "Clear Edit History")) return;

                                let position = buttons.findIndex((x) => {
                                    const label = typeof x?.props?.label === "string" ? x.props.label.toLowerCase() : "";
                                    const msgProp = typeof x?.props?.message === "string" ? x.props.message.toLowerCase() : "";
                                    return label.includes("unread") || label.includes("copy") || msgProp.includes("unread") || msgProp.includes("copy");
                                });
                                if (position < 0) position = 0;

                                const handleClearHistory = () => {
                                    editHistory.delete(message.id);
                                    const clean = extractCleanContent(message.content);
                                    const channelId = message.channel_id ?? message.channelId;
                                    const originalMessage = getOriginalMessage(channelId, message.id);

                                    FluxDispatcher.dispatch({
                                        type: "MESSAGE_UPDATE",
                                        channelId,
                                        message: {
                                            ...originalMessage,
                                            ...message,
                                            content: clean,
                                            edited_timestamp: originalMessage?.edited_timestamp ?? new Date().toISOString(),
                                        },
                                        otherPluginBypass: true,
                                    });

                                    LazyActionSheet.hideActionSheet();
                                    try {
                                        showToast("Edit history cleared", getAssetIDByName("ic_edit_24px"));
                                    } catch {}
                                };

                                const iconAsset = getAssetIDByName("ic_edit_24px");
                                const iconElement = ActionSheetRowComponent?.Icon
                                    ? <ActionSheetRowComponent.Icon source={iconAsset} />
                                    : FormRow?.Icon
                                    ? <FormRow.Icon source={iconAsset} />
                                    : undefined;

                                if (ActionSheetRowComponent) {
                                    buttons.splice(position, 0, (
                                        <ActionSheetRowComponent
                                            label="Clear Edit History"
                                            icon={iconElement}
                                            onPress={handleClearHistory}
                                        />
                                    ));
                                } else if (FormRow) {
                                    buttons.splice(position, 0, (
                                        <FormRow
                                            label="Clear Edit History"
                                            leading={iconElement}
                                            onPress={handleClearHistory}
                                        />
                                    ));
                                }
                            });
                        });
                    })
                );
            }
        } catch (e) {
            console.error("[noEdit]", e);
        }
    },
    onUnload() {
        for (const unpatch of patches) {
            try {
                unpatch();
            } catch {}
        }
        patches.length = 0;
        editHistory.clear();
    }
};
