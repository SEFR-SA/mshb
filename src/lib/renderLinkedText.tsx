import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
const EMOJI_REGEX = /:([a-zA-Z0-9_]+):/g;

/** Render a plain text segment, converting URLs to clickable links */
function renderUrls(text: string): React.ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400 hover:text-blue-300"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    URL_REGEX.lastIndex = 0;
    return part as unknown as React.ReactNode;
  });
}

export function renderLinkedText(
  text: string,
  serverEmojis?: Array<{ name: string; url: string }>
): React.ReactNode {
  if (!serverEmojis || serverEmojis.length === 0) {
    return <>{renderUrls(text)}</>;
  }

  const emojiMap = new Map(serverEmojis.map((e) => [e.name, e.url]));
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  EMOJI_REGEX.lastIndex = 0;

  while ((match = EMOJI_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      parts.push(...renderUrls(before));
    }
    const emojiUrl = emojiMap.get(match[1]);
    if (emojiUrl) {
      parts.push(
        <img
          key={`emoji-${match.index}`}
          src={emojiUrl}
          className="h-5 w-5 inline-block align-text-bottom"
          alt={match[0]}
        />
      );
    } else {
      // Unknown :name: — leave as plain text
      parts.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...renderUrls(text.slice(lastIndex)));
  }

  return <>{parts}</>;
}
