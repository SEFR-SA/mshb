import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, Eye, EyeOff, Bold, Italic, Strikethrough, Code, List, ListOrdered, Link, Heading1, Heading2, Heading3 } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

type WrapOp = { before: string; after?: string; linePrefix?: string };

const MarkdownToolbar = ({ value, onChange, onSend, disabled, placeholder }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  /** Wraps selected text with before/after markers, or inserts at cursor */
  const wrap = ({ before, after = before }: WrapOp) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const selected = value.slice(s, e) || "text";
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  };

  /** Prepends a line prefix to all selected lines */
  const linePrefix = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const lines = value.slice(s, e || s).split("\n");
    // If already prefixed → remove, else add
    const allPrefixed = lines.every((l) => l.startsWith(prefix));
    const newLines = lines.map((l) => (allPrefixed ? l.slice(prefix.length) : prefix + l));
    const replaced = newLines.join("\n");
    const next = value.slice(0, s) + replaced + value.slice(e || s);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s, s + replaced.length);
    });
  };

  const insertLink = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const selected = value.slice(s, e) || "link text";
    const insertion = `[${selected}](url)`;
    const next = value.slice(0, s) + insertion + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      // Select "url" for easy replacement
      const urlStart = s + selected.length + 3;
      ta.setSelectionRange(urlStart, urlStart + 3);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSend();
    }
  };

  const TOOLBAR_BUTTONS = [
    { icon: Heading1, title: "Heading 1", action: () => linePrefix("# ") },
    { icon: Heading2, title: "Heading 2", action: () => linePrefix("## ") },
    { icon: Heading3, title: "Heading 3", action: () => linePrefix("### ") },
    { icon: null, divider: true },
    { icon: Bold,          title: "Bold",          action: () => wrap({ before: "**", after: "**" }) },
    { icon: Italic,        title: "Italic",         action: () => wrap({ before: "_", after: "_" }) },
    { icon: Strikethrough, title: "Strikethrough",  action: () => wrap({ before: "~~", after: "~~" }) },
    { icon: null, divider: true },
    { icon: Code,          title: "Inline code",    action: () => wrap({ before: "`", after: "`" }) },
    { icon: null, divider: true },
    { icon: Link,          title: "Link",           action: insertLink },
    { icon: List,          title: "Bullet list",    action: () => linePrefix("- ") },
    { icon: ListOrdered,   title: "Numbered list",  action: () => linePrefix("1. ") },
  ] as const;

  return (
    <div className="rounded-xl border border-border/40 theme-input overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/30 flex-wrap">
        {TOOLBAR_BUTTONS.map((btn, i) => {
          if ("divider" in btn && btn.divider) {
            return <div key={i} className="w-px h-4 bg-border/50 mx-0.5" />;
          }
          const Icon = btn.icon!;
          return (
            <button
              key={i}
              type="button"
              title={btn.title}
              onMouseDown={(e) => { e.preventDefault(); btn.action(); }}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview toggle */}
        <button
          type="button"
          title={preview ? "Edit" : "Preview"}
          onMouseDown={(e) => { e.preventDefault(); setPreview((p) => !p); }}
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-foreground",
            preview ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
          )}
        >
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Content area */}
      <div className="flex items-end gap-2 px-2 py-1.5">
        {preview ? (
          <div className="flex-1 min-h-[40px] max-h-[200px] overflow-y-auto px-1 py-0.5 text-sm">
            {value.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold mt-1 mb-0.5">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold mt-1 mb-0.5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold mt-1 mb-0.5">{children}</h3>,
                  p:  ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ms-4 mb-1 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ms-4 mb-1 space-y-0.5">{children}</ol>,
                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
                  code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                  pre: ({ children }) => <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto mb-1">{children}</pre>,
                  blockquote: ({ children }) => <blockquote className="border-s-4 border-primary/50 ps-3 italic text-muted-foreground mb-1">{children}</blockquote>,
                  a: ({ href, children }) => <a href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-muted-foreground/50 text-sm">Nothing to preview...</span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Write an announcement... (Markdown supported)"}
            disabled={disabled}
            rows={3}
            className="flex-1 min-h-[40px] max-h-[200px] resize-none bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed"
          />
        )}

        <Button
          size="icon"
          className="shrink-0 mb-0.5"
          onClick={onSend}
          disabled={!value.trim() || disabled}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MarkdownToolbar;
