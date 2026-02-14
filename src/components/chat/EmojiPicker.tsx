import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const categories = [
  {
    key: "smileys",
    label: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩",
      "😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🫡",
      "🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴",
      "😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐",
      "😕","🫤","😟","🙁","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢",
      "😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀",
      "💩","🤡","👹","👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
    ],
  },
  {
    key: "people",
    label: "👋",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟",
      "🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏",
      "🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻",
      "👃","🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄","🫦","👶","🧒","👦","👧","🧑",
      "👱","👨","🧔","👩","🧓","👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷",
    ],
  },
  {
    key: "animals",
    label: "🐶",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
      "🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗",
      "🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🪳","🦟","🦗","🕷️","🦂",
      "🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋",
      "🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃",
    ],
  },
  {
    key: "food",
    label: "🍕",
    emojis: [
      "🍇","🍈","🍉","🍊","🍋","🍌","🍍","🥭","🍎","🍏","🍐","🍑","🍒","🍓","🫐","🥝",
      "🍅","🫒","🥥","🥑","🍆","🥔","🥕","🌽","🌶️","🫑","🥒","🥬","🥦","🧄","🧅","🍄",
      "🥜","🫘","🌰","🍞","🥐","🥖","🫓","🥨","🥯","🥞","🧇","🧀","🍖","🍗","🥩","🥓",
      "🍔","🍟","🍕","🌭","🥪","🌮","🌯","🫔","🥙","🧆","🥚","🍳","🥘","🍲","🫕","🥣",
      "🥗","🍿","🧈","🧂","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤",
    ],
  },
  {
    key: "travel",
    label: "✈️",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵",
      "🚲","🛴","🛹","🛼","🚁","✈️","🛩️","🚀","🛸","🚢","⛵","🛶","🚤","🛥️","⛴️","🏠",
      "🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼",
      "🗽","⛪","🕌","🛕","🕍","⛩️","🌍","🌎","🌏","🗺️","🧭","🏔️","⛰️","🌋","🗻","🏕️",
    ],
  },
  {
    key: "objects",
    label: "💡",
    emojis: [
      "⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","🖲️","💾","💿","📀","📷","📹","🎥","📽️","🎞️",
      "📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳",
      "💡","🔦","🕯️","🪔","🧯","🛢️","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️",
      "🪜","🧰","🪛","🔧","🔨","⚒️","🛠️","⛏️","🪚","🔩","⚙️","🪤","🧲","🔫","💣","🧨",
      "🪓","🔪","🗡️","⚔️","🛡️","🚬","⚰️","🪦","⚱️","🏺","🔮","📿","🧿","🪬","💈","⚗️",
    ],
  },
  {
    key: "symbols",
    label: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓",
      "💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐",
      "⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑",
      "☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴",
      "🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯",
      "💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🚭","❗","❕","❓","❔","‼️","⁉️","🔅","🔆",
      "⚠️","🚸","🔱","⚜️","🔰","♻️","✅","🈯","💹","❇️","✳️","❎","🌐","💠","Ⓜ️","🌀",
      "💤","🏧","🚾","♿","🅿️","🛗","🈳","🈂️","🛂","🛃","🛄","🛅","🚹","🚺","🚼","⚧️",
    ],
  },
  {
    key: "flags",
    label: "🏁",
    emojis: [
      "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️",
      "🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇯🇵","🇰🇷","🇨🇳","🇮🇳","🇧🇷","🇷🇺","🇮🇹","🇪🇸",
      "🇨🇦","🇦🇺","🇲🇽","🇸🇦","🇦🇪","🇪🇬","🇹🇷","🇳🇬","🇿🇦","🇰🇪","🇵🇰","🇮🇩",
      "🇹🇭","🇻🇳","🇵🇭","🇲🇾","🇸🇬","🇳🇱","🇧🇪","🇨🇭","🇦🇹","🇸🇪","🇳🇴","🇩🇰",
      "🇫🇮","🇵🇱","🇺🇦","🇬🇷","🇵🇹","🇮🇪","🇦🇷","🇨🇱","🇨🇴","🇵🇪","🇻🇪","🇨🇺",
    ],
  },
];

// Simple keyword map for search
const emojiKeywords: Record<string, string[]> = {
  "😀": ["grin","happy","smile"], "😂": ["laugh","cry","joy"], "❤️": ["heart","love","red"],
  "👍": ["thumbs","up","like","yes"], "👎": ["thumbs","down","dislike","no"], "🔥": ["fire","hot","lit"],
  "🎉": ["party","celebrate","tada"], "😍": ["love","heart","eyes"], "😭": ["cry","sad","tears"],
  "🤔": ["think","hmm"], "👋": ["wave","hi","hello","bye"], "🙏": ["pray","please","thanks"],
  "💀": ["skull","dead"], "😎": ["cool","sunglasses"], "🥺": ["pleading","puppy"],
  "😤": ["angry","huff"], "🤣": ["rofl","laugh"], "💯": ["hundred","perfect"],
  "✅": ["check","done","yes"], "❌": ["cross","no","wrong"], "⭐": ["star"],
};

const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState("");

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: string[] = [];
    for (const cat of categories) {
      for (const emoji of cat.emojis) {
        const kw = emojiKeywords[emoji];
        if (kw?.some((k) => k.includes(q)) || emoji.includes(q)) {
          results.push(emoji);
        }
      }
    }
    return results;
  }, [search]);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
    setSearch("");
  };

  const displayEmojis = filteredEmojis ?? categories[activeCategory].emojis;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" type="button">
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" side="top" align="start">
        <div className="flex flex-col h-[350px]">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("emoji.search")}
              className="h-8 text-sm"
            />
          </div>

          {/* Category tabs */}
          {!search.trim() && (
            <div className="flex items-center gap-0.5 px-1 py-1 border-b border-border overflow-x-auto">
              {categories.map((cat, i) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(i)}
                  className={`px-2 py-1 text-lg rounded hover:bg-muted transition-colors shrink-0 ${
                    activeCategory === i ? "bg-muted" : ""
                  }`}
                  type="button"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Emoji grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-8 gap-0.5 p-2">
              {displayEmojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => handleSelect(emoji)}
                  className="h-9 w-9 flex items-center justify-center text-xl rounded hover:bg-muted transition-colors"
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {filteredEmojis && filteredEmojis.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">{t("mentions.noResults")}</p>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
