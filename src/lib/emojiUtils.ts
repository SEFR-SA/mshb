const emojiRegex = /\p{Extended_Pictographic}/gu;

export const isEmojiOnly = (text: string): boolean => {
  if (!text || !text.trim()) return false;
  const withoutWhitespace = text.replace(/\s/g, "");
  const withoutEmojis = withoutWhitespace.replace(emojiRegex, "");
  // Allow variation selectors and zero-width joiners that combine emojis
  const remaining = withoutEmojis.replace(/[\uFE0F\uFE0E\u200D]/g, "");
  return remaining.length === 0;
};

export const countEmojis = (text: string): number => {
  const matches = text.match(emojiRegex);
  return matches ? matches.length : 0;
};

export const getEmojiClass = (text: string): string => {
  if (isEmojiOnly(text) && countEmojis(text) <= 30) {
    return "text-4xl leading-relaxed";
  }
  return "";
};
