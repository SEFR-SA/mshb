import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a file to the chat-files bucket and return its public URL.
 */
export const uploadChatFile = async (userId: string, file: File): Promise<string> => {
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}_${sanitized}`;

  const { error } = await supabase.storage
    .from("chat-files")
    .upload(path, file);

  if (error) throw error;

  const { data } = supabase.storage.from("chat-files").getPublicUrl(path);
  return data.publicUrl;
};
