import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;

export function renderLinkedText(text: string): React.ReactNode {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0; // reset after test
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
    URL_REGEX.lastIndex = 0; // reset after test
    return part;
  });
}
