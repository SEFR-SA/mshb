DROP TRIGGER IF EXISTS trg_notify_on_dm_message ON public.messages;
DROP FUNCTION IF EXISTS public.notify_on_dm_message();