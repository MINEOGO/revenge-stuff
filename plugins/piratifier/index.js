import Settings from "./settings.jsx";
import { findByProps } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";

const patches = [];

// yes i know i shouldnt hardcode this, but im lazy so idrc!!
const dictionary = {
	"hello": "ahoy",
	"hi": "ahoy",
	"my": "me",
	"friend": "matey",
	"friends": "mateys",
	"you": "ye",
	"your": "yer",
	"people": "scallywags",
	"man": "matey",
	"woman": "wench",
	"boy": "lad",
	"girl": "lass",
	"yes": "aye",
	"no": "nay",
	"of": "o'",
	"the": "ye",
	"is": "be",
	"are": "be",
	"am": "be",
	"was": "were",
	"were": "be",
	"stop": "heave to",
	"money": "doubloons",
	"gold": "doubloons",
	"cash": "booty",
	"treasure": "booty",
	"beer": "grog",
	"wine": "grog",
	"liquor": "grog",
	"drink": "grog",
	"quick": "smartly",
	"quickly": "smartly",
	"old": "barnacle-covered",
	"where": "whither",
	"there": "thither",
	"here": "hither",
	"please": "prithee",
	"thank": "tip me hat to",
	"thanks": "tip me hat to",
	"captain": "cap'n",
	"boss": "cap'n",
	"sir": "matey",
	"madam": "wench",
	"excuse me": "avast",
	"look": "avast",
	"hey": "ahoy",
	"toilet": "head",
	"restroom": "head",
	"bathroom": "head",
	"die": "walk the plank",
	"kill": "send to Davy Jones",
	"destroy": "scuttle",
	"sink": "scuttle",
	"cheat": "hornswoggle",
	"steal": "plunder",
	"rob": "plunder",
	"stole": "plundered",
	"everyone": "all hands",
	"everybody": "all hands",
	"us": "we",
	"our": "our own",
	"them": "them scallywags",
	"they": "they scallywags",
	"him": "that lad",
	"her": "that lass",
	"small": "wee",
	"little": "wee",
	"big": "mighty",
	"large": "mighty",
	"great": "grand",
	"good": "fine",
	"bad": "rotten",
	"scared": "lily-livered",
	"cowardly": "lily-livered",
	"crazy": "addled",
	"mad": "addled",
	"drunk": "three sheets to the wind",
	"nonsense": "balderdash",
	"lie": "tall tale",
	"lies": "tall tales",
	"song": "shanty",
	"music": "shanty",
	"sing": "chantey",
	"clean": "swab",
	"wash": "swab",
	"floor": "deck",
	"ground": "deck",
	"wall": "bulkhead",
	"ceiling": "overhead",
	"bed": "hammock",
	"sleeping": "snoozing in the hammock",
	"sleep": "catch some shuteye",
	"sword": "cutlass",
	"gun": "flintlock",
	"pistol": "flintlock",
	"cannon": "great gun",
	"bullets": "grape shot",
	"ammo": "powder and shot",
	"fight": "skirmish",
	"war": "battle royale",
	"jail": "brig",
	"prison": "brig",
	"food": "grub",
	"meat": "salt pork",
	"bread": "hard tack",
	"biscuit": "hard tack",
	"cookies": "hard tack",
	"water": "scuttlebutt",
	"soda": "sweet water",
	"juice": "sweet water",
	"milk": "goat's milk",
	"tea": "hot grog",
	"coffee": "black grog",
	"fish": "sea dog",
	"shark": "landlubber's bane",
	"monster": "kraken",
	"dog": "salty hound",
	"cat": "mouser",
	"bird": "feathered matey",
	"parrot": "polly",
	"monkey": "jacko",
	"left": "port",
	"right": "starboard",
	"front": "bow",
	"back": "stern",
	"forward": "fore",
	"backward": "aft",
	"up": "aloft",
	"down": "below",
	"fast": "swiftly",
	"slow": "sluggish",
	"heavy": "burdensome",
	"light": "featherweight",
	"hot": "blazing",
	"cold": "freezing",
	"warm": "balmy",
	"cool": "breezy",
	"wet": "soggy",
	"dry": "parched",
	"dirty": "grimy",
	"neat": "spruce",
	"tidy": "spruce",
	"beautiful": "fair",
	"ugly": "homely",
	"rich": "wealthy",
	"poor": "broke",
	"strong": "hearty",
	"weak": "feeble",
	"brave": "bold",
	"happy": "jolly",
	"sad": "dreary",
	"angry": "wrathful",
	"scared": "timorous",
	"tired": "weary",
	"sleepy": "weary",
	"hungry": "famished",
	"thirsty": "parched",
	"sick": "scurvy-ridden",
	"ill": "scurvy-ridden",
	"healthy": "sound",
	"well": "sound",
	"smart": "clever",
	"stupid": "dull",
	"foolish": "dull",
	"wise": "sage",
	"young": "spry",
	"new": "fresh",
	"safe": "secure",
	"danger": "peril",
	"dangerous": "perilous",
	"easy": "simple",
	"difficult": "hard",
	"clean": "swabbed",
	"dirty": "unwashed",
	"fast": "fleet",
	"slow": "leisurely",
	"loud": "boisterous",
	"quiet": "silent",
	"soft": "gentle",
	"hard": "stiff",
	"heavy": "hefty",
	"light": "airy",
	"full": "brimming",
	"empty": "hollow",
	"open": "unlocked",
	"closed": "shut",
	"near": "close",
	"far": "distant",
        "nigga": "nige'",
        "nigger": "nig'r"
};

function localPirateify(text) {
	if (!text) return text;
	let words = text.split(/\b/);
	for (let i = 0; i < words.length; i++) {
		let w = words[i].toLowerCase();
		if (dictionary[w]) {
			let repl = dictionary[w];
			if (words[i][0] === words[i][0].toUpperCase()) {
				repl = repl.charAt(0).toUpperCase() + repl.slice(1);
			}
			words[i] = repl;
		}
	}
	let result = words.join("");
	if (Math.random() < 0.5) {
		const additions = [" Ahoy!", " Matey!", " Arr!", " Arrrgh!", " Shiver me timbers!", " Ye scurvy dog!"];
		result += additions[Math.floor(Math.random() * additions.length)];
	}
	return result;
}

async function fetchPirateify(text) {
	try {
		const res = await fetch(`https://pirate.monkeyness.com/api/translate?english=${encodeURIComponent(text)}`);
		if (res.ok) {
			return await res.text();
		}
	} catch (e) {}
	return localPirateify(text);
}

export default {
	settings: Settings,
	onUnload() {
		for (const unpatch of patches) unpatch();
	},
	onLoad() {
		storage.settings ??= {};
		if (storage.settings.use_ai === undefined) {
			storage.settings.use_ai = true;
		}

		const Messages = findByProps("sendMessage", "receiveMessage");
		patches.push(
			instead("sendMessage", Messages, async (args, orig) => {
				if (!args[1] || args[1]._command_output) {
					return orig.apply(this, args);
				}

				const text = args[1].content;
				if (!text) {
					return orig.apply(this, args);
				}

				if (storage.settings.use_ai) {
					showToast("piratifying it...");
					try {
						const translated = await fetchPirateify(text);
						args[1].content = translated;
					} catch (e) {
						args[1].content = localPirateify(text);
					}
				} else {
					args[1].content = localPirateify(text);
				}

				return orig.apply(this, args);
			})
		);
	}
};
