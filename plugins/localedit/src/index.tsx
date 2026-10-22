import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher, i18n } from "@vendetta/metro/common";
import { before, after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRowComponent = findByProps("ActionSheetRow")?.ActionSheetRow;
const FormRow = Forms?.FormRow;
const ActionSheetRow = ActionSheetRowComponent ?? FormRow;
const MessageStore = findByStoreName("MessageStore");
const UserStore = findByStoreName("UserStore");
const Messages = findByProps("startEditMessage", "editMessage") ?? findByProps("sendMessage", "startEditMessage", "editMessage") ?? findByProps("sendMessage", "editMessage");

const edits = new Map<string, any>();
let isEditing = false;
let patches: (() => void)[] = [];

export default {
    onLoad() {
        if (LazyActionSheet) {
            patches.push(before("openLazy", LazyActionSheet, ([component, key, msg]) => {
                const message = msg?.message;
                if (key !== "MessageLongPressActionSheet" || !message) return;

                component.then((instance: any) => {
                    const unpatch = after("default", instance, (_, res) => {
                        setTimeout(unpatch, 0);

                        const buttons = findInReactTree(res, x => x?.[0]?.type?.name === "ActionSheetRow" || x?.[0]?.type?.name === "ButtonRow");
                        if (!buttons || !Array.isArray(buttons)) return;

                        const currentUser = UserStore?.getCurrentUser?.();
                        const currentMessage = MessageStore?.getMessage?.(message.channel_id, message.id) ?? message;

                        if (currentUser && currentMessage?.author?.id === currentUser?.id) return;

                        if (buttons.some((b: any) => b?.props?.label === "Edit Locally")) return;

                        let markUnread: string | undefined;
                        try {
                            markUnread = (i18n as any)?.Messages?.MARK_UNREAD;
                        } catch {
                            // In Bunny / Revenge, accessing i18n.Messages throws if Messages module is not found.
                        }

                        let position = buttons.findIndex((x: any) => {
                            if (markUnread && (x?.props?.message === markUnread || x?.props?.label === markUnread)) {
                                return true;
                            }
                            const label = typeof x?.props?.label === "string" ? x.props.label.toLowerCase() : "";
                            const msgProp = typeof x?.props?.message === "string" ? x.props.message.toLowerCase() : "";
                            return label.includes("unread") || label.includes("copy") || msgProp.includes("unread") || msgProp.includes("copy");
                        });

                        if (position < 0) {
                            position = 0;
                        }

                        const handleEdit = () => {
                            isEditing = true;
                            if (!edits.has(currentMessage.id)) {
                                edits.set(currentMessage.id, JSON.parse(JSON.stringify(currentMessage)));
                            }
                            LazyActionSheet.hideActionSheet();
                            Messages?.startEditMessage?.(currentMessage.channel_id, currentMessage.id, currentMessage.content);
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
                                    label="Edit Locally"
                                    icon={iconElement}
                                    onPress={handleEdit}
                                />
                            ));
                        } else if (FormRow) {
                            buttons.splice(position, 0, (
                                <FormRow
                                    label="Edit Locally"
                                    leading={iconElement}
                                    onPress={handleEdit}
                                />
                            ));
                        }
                    });
                });
            }));
        }

        if (Messages) {
            patches.push(before("editMessage", Messages, (args) => {
                const [channelId, messageId, message] = args;

                if (isEditing) {
                    const baseMessage = edits.get(messageId);
                    if (!baseMessage) return;

                    FluxDispatcher.dispatch({
                        type: "MESSAGE_UPDATE",
                        message: {
                            ...baseMessage,
                            content: message.content,
                            edited_timestamp: null,
                        },
                        otherPluginBypass: true,
                    });
                    return false;
                }
            }));

            if (typeof (Messages as any).endEditMessage === "function") {
                patches.push(after("endEditMessage", Messages, () => {
                    if (isEditing) {
                        isEditing = false;
                    }
                }));
            }
        }
    },

    onUnload() {
        patches.forEach(p => {
            try {
                p();
            } catch {}
        });
        patches = [];
        edits.clear();
        isEditing = false;
    }
};
