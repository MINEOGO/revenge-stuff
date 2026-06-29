import Settings from "./settings.jsx";
import { findByProps } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { registerCommand } from "@vendetta/commands";

const patches = [];

// ─── Massive on-device pirate dictionary ─────────────────────────────────────
const dictionary = {
    // Greetings & basic
    "hello": "ahoy", "hi": "ahoy", "hey": "ahoy", "howdy": "ahoy there",
    "goodbye": "fare thee well", "bye": "fare thee well", "later": "till next tide",
    "welcome": "well met", "please": "prithee", "sorry": "I beg yer pardon",
    "excuse me": "avast", "look": "avast", "watch out": "avast",

    // Pronouns / determiners
    "my": "me", "your": "yer", "you": "ye", "i": "I",
    "i'm": "I be", "i am": "I be", "i'll": "I shall", "i've": "I have",
    "i'd": "I'd", "i was": "I were", "you're": "ye be", "you are": "ye be",
    "you'll": "ye shall", "you've": "ye have", "you'd": "ye'd",
    "he": "that scallywag", "she": "that lass", "him": "that lad", "her": "that lass",
    "his": "his", "hers": "hers", "they": "them scallywags", "them": "those scallywags",
    "their": "their own", "we": "we", "our": "our own", "us": "us lot",
    "it": "it", "its": "its",

    // Verbs & auxiliaries
    "is": "be", "are": "be", "am": "be", "was": "were", "were": "be",
    "will": "shall", "would": "would", "could": "could", "should": "should",
    "have": "have", "has": "have", "had": "had", "do": "do", "does": "do",
    "did": "did", "going": "sailin'", "go": "sail", "goes": "sails",
    "went": "sailed", "come": "come aboard", "came": "came aboard",
    "run": "scurry", "running": "scurryin'", "ran": "scurried",
    "walk": "tread", "walking": "trekkin'", "walked": "trekked",
    "stop": "heave to", "start": "set sail", "know": "ken", "knows": "kens",
    "known": "kenned", "understand": "fathom", "think": "reckon",
    "want": "desire", "want to": "be wantin' to", "need": "be needin'",
    "give": "bestow", "take": "plunder", "get": "procure", "got": "procured",
    "see": "spy", "look at": "lay eyes on", "find": "unearth",
    "tell": "spin a tale of", "say": "speak", "said": "spoke",
    "ask": "beseech", "use": "make use of", "make": "craft",
    "put": "place", "let": "allow", "keep": "hold",

    // People / titles
    "friend": "matey", "friends": "mateys", "man": "matey", "men": "mateys",
    "woman": "wench", "women": "wenches", "boy": "lad", "boys": "lads",
    "girl": "lass", "girls": "lasses", "people": "scallywags",
    "person": "scallywag", "everyone": "all hands", "everybody": "all hands",
    "someone": "some scallywag", "anyone": "any scallywag",
    "captain": "cap'n", "boss": "cap'n", "sir": "matey", "madam": "wench",
    "king": "Pirate King", "queen": "Pirate Queen", "prince": "young lad",
    "princess": "lass", "soldier": "bilge rat", "cop": "landlubber",
    "police": "landlubbers", "teacher": "wise elder", "doctor": "ship's surgeon",

    // Yes / No
    "yes": "aye", "yeah": "aye", "yep": "aye", "no": "nay",
    "nope": "nay", "not": "nay",

    // Money / treasure
    "money": "doubloons", "gold": "doubloons", "cash": "booty",
    "treasure": "booty", "rich": "flush with doubloons", "wealth": "plunder",
    "coins": "doubloons", "dollars": "doubloons", "bucks": "doubloons",

    // Drink & food
    "beer": "grog", "wine": "grog", "liquor": "grog", "drink": "grog",
    "alcohol": "spirits", "water": "scuttlebutt", "soda": "sweet water",
    "juice": "sweet water", "milk": "goat's milk", "tea": "hot grog",
    "coffee": "black grog", "food": "grub", "eat": "chow down",
    "eating": "chowin' down", "meat": "salt pork", "bread": "hard tack",
    "biscuit": "hard tack", "cookies": "hard tack", "cake": "sweet biscuit",
    "fish": "fresh catch", "chicken": "landlubber's bird",

    // Location / directions
    "left": "port", "right": "starboard", "front": "bow", "back": "stern",
    "forward": "fore", "backward": "aft", "up": "aloft", "down": "below",
    "here": "hither", "there": "thither", "where": "whither",
    "home": "port", "house": "quarters", "room": "quarters",
    "floor": "deck", "ground": "deck", "wall": "bulkhead",
    "ceiling": "overhead", "bed": "hammock", "bathroom": "head",
    "toilet": "head", "restroom": "head", "stairs": "the ladder",
    "door": "hatch", "window": "porthole", "boat": "vessel",
    "ship": "vessel", "car": "land vessel", "truck": "heavy land vessel",
    "plane": "sky vessel", "island": "isle",

    // Actions / verbs
    "fight": "clash blades", "fighting": "clashing blades",
    "kill": "send to Davy Jones' locker", "die": "walk the plank",
    "attack": "board", "destroy": "scuttle", "sink": "scuttle",
    "steal": "plunder", "rob": "plunder", "stole": "plundered",
    "cheat": "hornswoggle", "lie": "spin a tall tale",
    "lies": "tall tales", "lied": "spun a tall tale",
    "hide": "stow away", "run away": "abandon ship",
    "throw": "heave", "threw": "heaved", "catch": "snag",
    "clean": "swab", "wash": "swab", "fix": "repair", "break": "smash",
    "open": "pry open", "close": "batten down", "lock": "batten down",
    "sing": "chantey", "dance": "jig", "dancing": "jiggin'",
    "sleep": "catch some shuteye", "sleeping": "snoozing in the hammock",
    "work": "toil", "working": "toilin'",

    // Adjectives
    "small": "wee", "little": "wee", "big": "mighty", "large": "mighty",
    "great": "grand", "good": "fine", "bad": "rotten", "old": "barnacle-covered",
    "new": "fresh", "young": "spry", "fast": "fleet", "slow": "sluggish",
    "heavy": "burdensome", "light": "featherweight", "hot": "blazin'",
    "cold": "freezin'", "warm": "balmy", "cool": "breezy",
    "wet": "soggy", "dry": "parched", "dirty": "grimy", "clean": "swabbed",
    "beautiful": "fair", "ugly": "homely", "strong": "hearty",
    "weak": "feeble", "brave": "bold", "happy": "jolly", "sad": "dreary",
    "angry": "wrathful", "scared": "lily-livered", "tired": "weary",
    "sleepy": "weary", "hungry": "famished", "thirsty": "parched",
    "sick": "scurvy-ridden", "ill": "scurvy-ridden", "healthy": "sound",
    "smart": "clever", "stupid": "dim-witted", "foolish": "daft",
    "crazy": "addled", "mad": "addled", "drunk": "three sheets to the wind",
    "safe": "secure", "dangerous": "perilous", "danger": "peril",
    "easy": "simple", "difficult": "a hard trial", "loud": "boisterous",
    "quiet": "silent as the deep", "soft": "gentle", "hard": "stiff",
    "full": "brimming", "empty": "hollow", "open": "unlocked",
    "near": "nigh", "far": "a great distance away",

    // Nouns / things
    "sword": "cutlass", "knife": "dagger", "gun": "flintlock",
    "pistol": "flintlock", "cannon": "great gun", "bullets": "grape shot",
    "ammo": "powder and shot", "bomb": "powder keg", "treasure chest": "bounty chest",
    "map": "chart", "compass": "navigation tool", "rope": "line",
    "anchor": "iron weight", "flag": "colours", "storm": "tempest",
    "sea": "the briny deep", "ocean": "the briny deep",
    "waves": "swells", "wind": "the gale", "rain": "the wet",
    "sun": "the blazing orb", "moon": "the pale lantern",
    "stars": "the celestial guides", "sky": "the heavens",
    "cloud": "the mist", "night": "the dark watch",
    "morning": "first light", "evening": "last light",
    "song": "shanty", "music": "shanty", "story": "tale",
    "book": "scroll", "letter": "missive", "message": "missive",
    "dog": "salty hound", "cat": "mouser", "bird": "feathered matey",
    "parrot": "polly", "monkey": "jacko", "shark": "the landlubber's bane",
    "monster": "kraken", "ghost": "the spirits of the deep",
    "jail": "the brig", "prison": "the brig", "law": "the code",
    "job": "post", "task": "mission", "problem": "a thorny situation",
    "answer": "the truth of it", "question": "riddle", "idea": "notion",
    "plan": "scheme", "deal": "bargain", "trade": "barter",
    "game": "sport", "fun": "merriment", "party": "gathering",
    "gift": "offering", "hate": "loathe", "love": "hold dear",
    "life": "existence at sea", "death": "Davy Jones' embrace",
    "god": "the sea gods", "heaven": "the great beyond",
    "hell": "Davy Jones' locker", "world": "the known seas",

    // Contractions and filler
    "the": "ye", "of": "o'", "and": "an'", "or": "or",
    "but": "but", "that": "that", "this": "this here",
    "these": "these here", "those": "them", "a": "a", "an": "a",
    "with": "wi'", "without": "without", "about": "about",
    "through": "through", "because": "on account of",
    "so": "so then", "then": "then", "when": "when",
    "while": "whilst", "after": "after", "before": "ere",
    "during": "durin'", "until": "till", "just": "merely",
    "still": "still", "also": "also", "too": "as well",
    "very": "mightily", "really": "truly", "quite": "right",
    "maybe": "perhaps", "probably": "like as not", "never": "ne'er",
    "always": "always", "often": "oft", "sometimes": "at times",
    "already": "already", "yet": "yet", "again": "once more",
    "together": "as one crew", "alone": "without yer shipmates",
    "away": "away", "back": "back", "out": "out",
    "in": "aboard", "into": "into", "onto": "onto",
    "off": "off", "over": "o'er", "under": "beneath",
    "around": "about", "between": "betwixt", "against": "against",
    "behind": "astern of", "inside": "within the hull",
    "outside": "on deck", "next": "next", "last": "last",
    "first": "first", "second": "second", "third": "third",
    "okay": "aye aye", "ok": "aye aye", "sure": "aye, sure enough",
    "thanks": "ye have me gratitude", "thank you": "ye have me deepest gratitude",
    "thank": "tip me hat to", "wow": "shiver me timbers",
    "damn": "blast", "hell": "Davy Jones' locker", "crap": "barnacles",
    "shit": "bilge water", "fuck": "blimey", "ass": "stern",
    "idiot": "bilge rat", "loser": "lily-livered scoundrel",
    "lol": "har har", "lmao": "har har har", "haha": "har har",
    "hehe": "heh heh", "omg": "blimey", "wtf": "what in Davy's name",
    "imo": "in me humble opinion", "tbh": "truth be told",
    "ngl": "I shan't lie", "brb": "I be away briefly",
    "gg": "well fought, matey", "rip": "lost to the depths",
};

// Pirate exclamations to sprinkle in
const exclamations = [
    "Ahoy!", "Arr!", "Arrrgh!", "Shiver me timbers!", "Blimey!", "Avast!",
    "Yo-ho-ho!", "Har har!", "By Davy Jones' beard!", "Hoist the colours!",
    "Dead men tell no tales!", "Batten down the hatches!", "Fire the cannons!",
];

// Pirate suffixes to append
const suffixes = [
    ", arr!", ", matey!", ", ye scurvy dog!", ", says I!", ", mark me words!",
    ", or I'll feed ye to the sharks!", ", on me honour as a pirate!",
    " — so swears the crew!", ", blast it all!", ", har!",
];

function localPiratify(text) {
    if (!text || !text.trim()) return text;

    // First pass: replace multi-word phrases (sorted longest first to avoid partial matches)
    const sortedKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);

    let result = text;
    for (const phrase of sortedKeys) {
        if (!phrase.includes(" ")) continue; // multi-word only in this pass
        const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
        result = result.replace(regex, (match) => {
            const repl = dictionary[phrase];
            // Preserve capitalisation
            if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
                return repl.charAt(0).toUpperCase() + repl.slice(1);
            }
            return repl;
        });
    }

    // Second pass: single words
    const words = result.split(/\b/);
    for (let i = 0; i < words.length; i++) {
        const w = words[i].toLowerCase();
        if (dictionary[w] && !dictionary[w].includes(" ")) {
            // Only replace if it's a single-word replacement (multi handled above)
            const repl = dictionary[w];
            if (words[i][0] && words[i][0] === words[i][0].toUpperCase() && words[i][0] !== words[i][0].toLowerCase()) {
                words[i] = repl.charAt(0).toUpperCase() + repl.slice(1);
            } else {
                words[i] = repl;
            }
        } else if (dictionary[w] && dictionary[w].includes(" ")) {
            // multi-word replacement for single word key
            const repl = dictionary[w];
            if (words[i][0] && words[i][0] === words[i][0].toUpperCase() && words[i][0] !== words[i][0].toLowerCase()) {
                words[i] = repl.charAt(0).toUpperCase() + repl.slice(1);
            } else {
                words[i] = repl;
            }
        }
    }
    result = words.join("");

    // Add pirate contractions: -ing → -in'
    result = result.replace(/\b(\w+)ing\b/g, (match, stem) => stem + "in'");

    // Add a random exclamation at start ~30% of the time
    if (Math.random() < 0.3) {
        const exc = exclamations[Math.floor(Math.random() * exclamations.length)];
        result = exc + " " + result;
    }

    // Add a random suffix ~50% of the time
    if (Math.random() < 0.5) {
        const suf = suffixes[Math.floor(Math.random() * suffixes.length)];
        // Remove trailing punctuation before adding suffix
        result = result.replace(/[.!?]+$/, "") + suf;
    }

    return result;
}

async function fetchPiratify(text) {
    const res = await fetch(
        `https://pirate.monkeyness.com/api/translate?english=${encodeURIComponent(text)}`
    );
    if (!res.ok) throw new Error("API error");
    return await res.text();
}

async function piratify(text) {
    storage.settings ??= {};
    if (storage.settings.on_device) {
        return localPiratify(text);
    }
    try {
        return await fetchPiratify(text);
    } catch {
        return localPiratify(text);
    }
}

export default {
    settings: Settings,

    onUnload() {
        for (const unpatch of patches) unpatch();
    },

    onLoad() {
        storage.settings ??= {};
        if (storage.settings.on_device === undefined) {
            storage.settings.on_device = true;
        }

        // ── Patch sendMessage to auto-piratify ─────────────────────────────
        const Messages = findByProps("sendMessage", "receiveMessage");
        patches.push(
            instead("sendMessage", Messages, async (args, orig) => {
                if (!args[1] || args[1]._piratify_skip || args[1]._command_output) {
                    return orig.apply(this, args);
                }
                const text = args[1]?.content;
                if (!text) return orig.apply(this, args);

                if (!storage.settings.on_device) showToast("piratifyin'...");
                try {
                    args[1].content = await piratify(text);
                } catch {
                    args[1].content = localPiratify(text);
                }
                return orig.apply(this, args);
            })
        );

        // ── /piratify slash command ─────────────────────────────────────────
        patches.push(
            registerCommand({
                name: "piratify",
                displayName: "piratify",
                description: "Piratify a message and send it",
                displayDescription: "Piratify a message and send it",
                applicationId: "-1",
                inputType: 1, // BUILT_IN_TEXT
                type: 1,      // CHAT
                options: [
                    {
                        name: "message",
                        displayName: "message",
                        description: "The message to piratify",
                        displayDescription: "The message to piratify",
                        required: true,
                        type: 3, // STRING
                    },
                    {
                        name: "on-device",
                        displayName: "on-device",
                        description: "Use on-device translation instead of the API (true/false)",
                        displayDescription: "Use on-device translation instead of the API (true/false)",
                        required: false,
                        type: 5, // BOOLEAN
                    },
                ],
                async execute(args, ctx) {
                    const messageArg = args.find((a) => a.name === "message");
                    const onDeviceArg = args.find((a) => a.name === "on-device");

                    const text = messageArg?.value;
                    if (!text) return { content: "Arr! Give me something to piratify, ye scallywag!" };

                    // If on-device arg given, use it; otherwise use global setting
                    const useOnDevice =
                        onDeviceArg !== undefined ? onDeviceArg.value : storage.settings.on_device;

                    let pirated;
                    if (useOnDevice) {
                        pirated = localPiratify(text);
                    } else {
                        try {
                            pirated = await fetchPiratify(text);
                        } catch {
                            pirated = localPiratify(text);
                        }
                    }

                    // Send the pirated message (skip the sendMessage patch so it doesn't double-piratify)
                    const Messages2 = findByProps("sendMessage", "receiveMessage");
                    Messages2.sendMessage(ctx.channel.id, {
                        content: pirated,
                        _piratify_skip: true,
                    });
                },
            })
        );
    },
};
