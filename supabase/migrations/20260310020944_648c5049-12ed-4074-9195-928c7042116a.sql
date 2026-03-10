DROP TRIGGER IF EXISTS on_user_boost_change ON public.user_boosts;
CREATE TRIGGER on_user_boost_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_boosts
  FOR EACH ROW EXECUTE FUNCTION public.handle_boost_change();