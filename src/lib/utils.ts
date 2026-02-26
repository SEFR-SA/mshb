import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Copies text to the clipboard.
 * Tries the modern Clipboard API first; falls back to the legacy execCommand
 * method for environments where navigator.clipboard is unavailable (e.g. Electron
 * running on a file:// origin).
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy method
  }

  // Legacy execCommand fallback.
  // Append inside an open Radix dialog (if any) so the focus trap doesn't
  // steal focus back before execCommand fires.
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    textarea.setAttribute("readonly", "");
    const container =
      (document.querySelector('[role="dialog"]') as HTMLElement | null) ??
      document.body;
    container.appendChild(textarea);
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand("copy");
    container.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
