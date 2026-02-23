-- Add 'type' column to messages table for system message types
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'message';

-- Backfill existing call system messages using emoji detection
UPDATE public.messages 
SET type = 'call_notification'
WHERE (content LIKE '📞%' OR content LIKE '📵%')
  AND type = 'message';
