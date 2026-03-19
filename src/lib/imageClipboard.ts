/**
 * Shared image clipboard and download utilities.
 * Provides Electron-safe fallbacks for copying images to the clipboard.
 */

/**
 * Converts any image blob to PNG via an offscreen canvas.
 */
async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") return blob;

  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image load failed"));
      el.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")?.drawImage(img, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("PNG conversion failed"));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Copies an image URL to the system clipboard.
 * Tries the modern Clipboard API first, then falls back to execCommand
 * for Electron / file:// contexts where ClipboardItem is blocked.
 */
export async function copyImageToClipboard(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const pngBlob = await toPngBlob(blob);

    // Primary: modern Clipboard API (works in browsers)
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      return true;
    } catch {
      // fall through to Electron native bridge
    }

    // Convert blob to data URI (needed by both fallbacks)
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(pngBlob);
    });

    // Fallback 1: Electron native clipboard via IPC bridge
    if ((window as any).electronAPI?.copyImageToClipboard) {
      try {
        const ok = await (window as any).electronAPI.copyImageToClipboard(dataUri);
        if (ok) return true;
      } catch {
        // fall through to legacy
      }
    }

    // Fallback 2: execCommand (last resort, unreliable for images)
    const img = document.createElement("img");
    img.src = dataUri;
    img.style.position = "fixed";
    img.style.top = "0";
    img.style.left = "0";
    img.style.opacity = "0";
    img.style.pointerEvents = "none";

    const container =
      (document.querySelector('[role="dialog"]') as HTMLElement | null) ??
      document.body;
    container.appendChild(img);

    const range = document.createRange();
    range.selectNode(img);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    const ok = document.execCommand("copy");
    sel?.removeAllRanges();
    container.removeChild(img);
    return ok;
  } catch (err) {
    console.error("copyImageToClipboard:", err);
    return false;
  }
}

/**
 * Downloads an image via a hidden <a> element.
 */
export async function saveImageAs(
  url: string,
  fileName: string,
): Promise<boolean> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
    return true;
  } catch (err) {
    console.error("saveImageAs:", err);
    return false;
  }
}
