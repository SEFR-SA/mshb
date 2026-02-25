import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Props extends Omit<React.ComponentProps<"textarea">, "rows"> {
  maxHeight?: number;
}

const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ className, maxHeight = 200, value, ...props }, ref) => {
    const localRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => localRef.current!);

    useEffect(() => {
      const el = localRef.current;
      if (!el) return;
      // Reset to auto so shrinking works correctly, then expand to content height
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    }, [value, maxHeight]);

    // Detect text direction from first strong bidi character
    const textDir = useMemo(() => {
      if (!value) return undefined;
      const str = String(value);
      for (let i = 0; i < str.length; i++) {
        const cp = str.codePointAt(i)!;
        // RTL scripts: Arabic, Hebrew, Syriac, Thaana, N'Ko, Samaritan, Mandaic,
        // Arabic Supplement/Extended, Arabic Presentation Forms
        if (
          (cp >= 0x0590 && cp <= 0x05FF) || // Hebrew
          (cp >= 0x0600 && cp <= 0x06FF) || // Arabic
          (cp >= 0x0700 && cp <= 0x074F) || // Syriac
          (cp >= 0x0780 && cp <= 0x07BF) || // Thaana
          (cp >= 0x07C0 && cp <= 0x07FF) || // N'Ko
          (cp >= 0x0800 && cp <= 0x083F) || // Samaritan
          (cp >= 0x0840 && cp <= 0x085F) || // Mandaic
          (cp >= 0x0870 && cp <= 0x089F) || // Arabic Extended-B
          (cp >= 0xFB50 && cp <= 0xFDFF) || // Arabic Presentation Forms-A
          (cp >= 0xFE70 && cp <= 0xFEFF)    // Arabic Presentation Forms-B
        ) {
          return "rtl" as const;
        }
        // LTR: Basic Latin letters, Latin Extended
        if (
          (cp >= 0x0041 && cp <= 0x005A) || // A-Z
          (cp >= 0x0061 && cp <= 0x007A) || // a-z
          (cp >= 0x00C0 && cp <= 0x024F)    // Latin Extended
        ) {
          return "ltr" as const;
        }
      }
      return undefined;
    }, [value]);

    return (
      <textarea
        rows={1}
        ref={localRef}
        value={value}
        dir={textDir}
        className={cn(
          "w-full bg-transparent border-0 outline-none px-1",
          "placeholder:text-muted-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "resize-none overflow-y-auto min-h-[40px] leading-[1.5]",
          className,
        )}
        style={{ maxHeight }}
        {...props}
      />
    );
  },
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export default AutoResizeTextarea;
