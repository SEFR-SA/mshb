
-- Add move_members to both permission RPCs

CREATE OR REPLACE FUNCTION public.get_user_permissions(_server_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid      uuid    := auth.uid();
  _result   jsonb   := '{}';
  _all_perms text[] := ARRAY[
    'manage_roles','create_expressions','view_audit_log','manage_server',
    'create_invites','kick_members','ban_members','view_channel',
    'manage_channel','send_messages','attach_files','mention_everyone',
    'delete_messages','create_polls','connect','speak','video',
    'mute_members','deafen_members','move_members'
  ];
  _key text;
BEGIN
  FOREACH _key IN ARRAY _all_perms LOOP
    _result := _result || jsonb_build_object(
      _key, has_role_permission(_uid, _server_id, _key)
    );
  END LOOP;
  RETURN _result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_permissions_strict(_server_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid      uuid    := auth.uid();
  _result   jsonb   := '{}';
  _all_perms text[] := ARRAY[
    'manage_roles','create_expressions','view_audit_log','manage_server',
    'create_invites','kick_members','ban_members','view_channel',
    'manage_channel','send_messages','attach_files','mention_everyone',
    'delete_messages','create_polls','connect','speak','video',
    'mute_members','deafen_members','move_members'
  ];
  _key text;
BEGIN
  FOREACH _key IN ARRAY _all_perms LOOP
    _result := _result || jsonb_build_object(
      _key, has_role_permission(_uid, _server_id, _key, true)
    );
  END LOOP;
  RETURN _result;
END;
$function$;
