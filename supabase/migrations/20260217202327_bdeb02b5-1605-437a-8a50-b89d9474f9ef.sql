
-- Add new columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;

-- Update handle_new_user trigger to populate new fields from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username, date_of_birth, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'username',
    (NEW.raw_user_meta_data->>'date_of_birth')::date,
    NEW.raw_user_meta_data->>'gender'
  );
  RETURN NEW;
END;
$function$;
