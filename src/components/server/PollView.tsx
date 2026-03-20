import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface PollViewProps {
  messageId: string;
}

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Poll closed";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(diff / 86_400_000);
  return `${days}d left`;
}

const PollView = ({ messageId }: PollViewProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [poll, setPoll]               = useState<any>(null);
  const [answers, setAnswers]         = useState<any[]>([]);
  const [votes, setVotes]             = useState<any[]>([]);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [voting, setVoting]           = useState(false);

  // ── Load poll data ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: pollData } = await supabase
        .from("polls" as any)
        .select("*")
        .eq("message_id", messageId)
        .maybeSingle();
      if (cancelled || !pollData) { setLoading(false); return; }
      setPoll(pollData as any);

      const [{ data: ansData }, { data: voteData }] = await Promise.all([
        supabase.from("poll_answers" as any).select("*").eq("poll_id", (pollData as any).id).order("position"),
        supabase.from("poll_votes"   as any).select("*").eq("poll_id", (pollData as any).id),
      ]);
      if (!cancelled) {
        setAnswers((ansData as any) || []);
        setVotes((voteData as any) || []);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [messageId]);

  // ── Refresh votes helper ───────────────────────────────────────────────────
  const refreshVotes = useCallback(async (pollId: string) => {
    const { data } = await supabase
      .from("poll_votes" as any)
      .select("*")
      .eq("poll_id", pollId);
    setVotes((data as any) || []);
  }, []);

  // ── Realtime: poll_votes changes ───────────────────────────────────────────
  useEffect(() => {
    if (!poll?.id) return;
    const channel = supabase
      .channel(`poll-votes-${poll.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "poll_votes",
        filter: `poll_id=eq.${poll.id}`,
      }, () => refreshVotes(poll.id))
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [poll?.id, refreshVotes]);

  // ── Derived state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-[400px] rounded-lg border border-border/40 bg-card/80 p-4 my-1 animate-pulse h-32" />
    );
  }
  if (!poll) return null;

  const userVoteIds   = new Set(votes.filter((v: any) => v.user_id === user?.id).map((v: any) => v.answer_id));
  const hasVoted      = userVoteIds.size > 0;
  const isExpired     = new Date(poll.expires_at) < new Date();
  const totalVotes    = votes.length;
  const inResultsMode = hasVoted || showResults || isExpired;
  const timeLeft      = formatTimeLeft(poll.expires_at);

  // ── Vote handler ───────────────────────────────────────────────────────────
  const handleVote = async () => {
    if (!user || voting || selected.size === 0) return;
    setVoting(true);
    try {
      for (const answerId of selected) {
        const { error } = await supabase.rpc("cast_poll_vote" as any, {
          p_poll_id: poll.id,
          p_answer_id: answerId,
        } as any);
        if (error) throw error;
      }
      setSelected(new Set());
      // Realtime will refresh votes
    } catch (err: any) {
      const msg = err?.message;
      if (msg?.includes("poll_expired")) {
        toast({ title: "This poll has expired.", variant: "destructive" });
      } else {
        toast({ title: t("common.error"), variant: "destructive" });
      }
    }
    setVoting(false);
  };

  // ── Remove vote handler ────────────────────────────────────────────────────
  const handleRemoveVote = async () => {
    if (!user || voting) return;
    setVoting(true);
    try {
      await supabase.rpc("remove_poll_votes" as any, { p_poll_id: poll.id } as any);
      // Optimistic update — Realtime DELETE filter requires REPLICA IDENTITY FULL; don't rely on it
      setVotes((prev) => prev.filter((v: any) => v.user_id !== user.id));
      setShowResults(false);
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setVoting(false);
  };

  // ── Toggle answer selection ────────────────────────────────────────────────
  const toggleAnswer = (answerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (poll.allow_multiple) {
        next.has(answerId) ? next.delete(answerId) : next.add(answerId);
      } else {
        next.clear();
        if (!prev.has(answerId)) next.add(answerId);
      }
      return next;
    });
  };

  return (
    <div className="max-w-[400px] w-full rounded-lg border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden my-1 shadow-md">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <p className="font-semibold text-sm text-foreground leading-snug">{poll.question}</p>
        {!inResultsMode && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {poll.allow_multiple ? t("polls.selectMultiple") : t("polls.selectOne")}
          </p>
        )}
      </div>

      {/* Answers */}
      <div className="px-4 space-y-2 pb-3">
        {answers.map((answer: any) => {
          const voteCount = votes.filter((v: any) => v.answer_id === answer.id).length;
          const pct       = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const userVoted = userVoteIds.has(answer.id);
          const isSelected = selected.has(answer.id);

          if (inResultsMode) {
            // ── Results view ──────────────────────────────────────────────
            return (
              <div key={answer.id} className="relative rounded-md overflow-hidden border border-border/30">
                {/* Background fill bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
                {/* Content row */}
                <div className="relative flex items-center justify-between px-3 py-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {userVoted && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    {answer.emoji && <span className="text-sm shrink-0">{answer.emoji}</span>}
                    <span className="text-sm truncate">{answer.text}</span>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{pct}%</span>
                    <span>({voteCount})</span>
                  </div>
                </div>
              </div>
            );
          }

          // ── Voting view ───────────────────────────────────────────────────
          return (
            <button
              key={answer.id}
              type="button"
              onClick={() => toggleAnswer(answer.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm text-left transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/40 hover:border-border hover:bg-muted/40 text-foreground"
              }`}
            >
              {/* Radio / Checkbox indicator */}
              <span
                className={`shrink-0 h-4 w-4 flex items-center justify-center border-2 transition-colors ${
                  poll.allow_multiple ? "rounded-sm" : "rounded-full"
                } ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/50"}`}
              >
                {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </span>
              {answer.emoji && <span className="shrink-0">{answer.emoji}</span>}
              <span className="flex-1">{answer.text}</span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between gap-3 flex-wrap">
        {/* Vote count + time */}
        <span className="text-xs text-muted-foreground">
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          {" • "}
          {isExpired ? <span className="text-muted-foreground/70">{t("polls.closed")}</span> : timeLeft}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!inResultsMode && !isExpired && (
            <>
              <button
                type="button"
                onClick={() => setShowResults(true)}
                className="text-xs text-primary hover:underline"
              >
                {t("polls.showResults")}
              </button>
              <Button
                size="sm"
                onClick={handleVote}
                disabled={selected.size === 0 || voting}
                className="h-7 text-xs px-3"
              >
                {t("polls.vote")}
              </Button>
            </>
          )}

          {inResultsMode && !isExpired && (
            <>
              {showResults && !hasVoted && (
                <button
                  type="button"
                  onClick={() => setShowResults(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("polls.hideResults")}
                </button>
              )}
              {hasVoted && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRemoveVote}
                  disabled={voting}
                  className="h-7 text-xs px-3 text-muted-foreground hover:text-foreground"
                >
                  {t("polls.removeVote")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollView;
