import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a file to the chat-files bucket and return its public URL.
 * Accepts an optional onProgress callback for tracking upload progress (0-100).
 */
export const uploadChatFile = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}_${sanitized}`;

  // Use XMLHttpRequest for progress tracking if callback provided
  if (onProgress) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${supabaseUrl}/storage/v1/object/chat-files/${path}`;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const { data } = supabase.storage.from("chat-files").getPublicUrl(path);
          resolve(data.publicUrl);
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));

      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", supabaseKey);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.send(file);
    });
  }

  // Standard upload without progress
  const { error } = await supabase.storage
    .from("chat-files")
    .upload(path, file);

  if (error) throw error;

  const { data } = supabase.storage.from("chat-files").getPublicUrl(path);
  return data.publicUrl;
};
