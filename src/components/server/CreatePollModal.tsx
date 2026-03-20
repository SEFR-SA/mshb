import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmojiPicker from "@/components/chat/EmojiPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
}

interface AnswerRow {
  id: string;
  text: string;
  emoji: string | null;
}

const DURATIONS = [
  { id: "1h",  label: "1 hour",   ms: 3_600_000 },
  { id: "4h",  label: "4 hours",  ms: 14_400_000 },
  { id: "8h",  label: "8 hours",  ms: 28_800_000 },
  { id: "24h", label: "24 hours", ms: 86_400_000 },
  { id: "3d",  label: "3 days",   ms: 259_200_000 },
  { id: "1w",  label: "1 week",   ms: 604_800_000 },
  { id: "2w",  label: "2 weeks",  ms: 1_209_600_000 },
];

const makeAnswer = (): AnswerRow => ({ id: crypto.randomUUID(), text: "", emoji: null });

const CreatePollModal = ({ open, onOpenChange, channelId }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [question, setQuestion]         = useState("");
  const [answers, setAnswers]           = useState<AnswerRow[]>([makeAnswer(), makeAnswer()]);
  const [duration, setDuration]         = useState("24h");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [creating, setCreating]         = useState(false);

  const updateAnswer = (id: string, patch: Partial<AnswerRow>) =>
    setAnswers((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const removeAnswer = (id: string) =>
    setAnswers((prev) => prev.filter((a) => a.id !== id));

  const addAnswer = () => {
    if (answers.length >= 10) return;
    setAnswers((prev) => [...prev, makeAnswer()]);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setQuestion("");
      setAnswers([makeAnswer(), makeAnswer()]);
      setDuration("24h");
      setAllowMultiple(false);
    }, 200);
  };

  const handlePost = async () => {
    if (!user || creating) return;
    const validAnswers = answers.filter((a) => a.text.trim());
    if (!question.trim() || validAnswers.length < 2) return;

    setCreating(true);
    try {
      const durationMs = DURATIONS.find((d) => d.id === duration)?.ms ?? 86_400_000;
      const expiresAt  = new Date(Date.now() + durationMs).toISOString();

      // 1. Insert the message (type='poll')
      const { data: msgData, error: msgError } = await supabase
        .from("messages" as any)
        .insert({ channel_id: channelId, author_id: user.id, content: question.trim(), type: "poll" } as any)
        .select("id")
        .single();
      if (msgError) throw msgError;

      // 2. Insert the poll row
      const { data: pollData, error: pollError } = await supabase
        .from("polls" as any)
        .insert({ message_id: (msgData as any).id, question: question.trim(), allow_multiple: allowMultiple, expires_at: expiresAt } as any)
        .select("id")
        .single();
      if (pollError) throw pollError;

      // 3. Insert answers
      const rows = validAnswers.map((a, i) => ({
        poll_id:  (pollData as any).id,
        text:     a.text.trim(),
        emoji:    a.emoji,
        position: i,
      }));
      const { error: ansError } = await supabase.from("poll_answers" as any).insert(rows as any);
      if (ansError) throw ansError;

      toast({ title: t("polls.created") });
      handleClose();
    } catch (err) {
      console.error("CreatePollModal:", err);
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setCreating(false);
  };

  const canPost = question.trim().length > 0 && answers.filter((a) => a.text.trim()).length >= 2;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("polls.create")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Question */}
          <div className="space-y-1.5">
            <Label>{t("polls.question")}</Label>
            <div className="relative">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
                placeholder={t("polls.questionPlaceholder")}
                rows={2}
                className="resize-none pr-16"
              />
              <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground pointer-events-none">
                {question.length} / 300
              </span>
            </div>
          </div>

          {/* Answers */}
          <div className="space-y-2">
            <Label>{t("polls.answers")}</Label>
            <div className="space-y-2">
              {answers.map((answer) => (
                <div key={answer.id} className="flex items-center gap-2">
                  {/* Emoji slot */}
                  <div className="shrink-0">
                    {answer.emoji ? (
                      <button
                        type="button"
                        title="Remove emoji"
                        onClick={() => updateAnswer(answer.id, { emoji: null })}
                        className="h-9 w-9 flex items-center justify-center text-lg rounded-md hover:bg-muted/60 transition-colors"
                      >
                        {answer.emoji}
                      </button>
                    ) : (
                      <EmojiPicker
                        onEmojiSelect={(emoji) => updateAnswer(answer.id, { emoji })}
                      />
                    )}
                  </div>

                  {/* Text input */}
                  <Input
                    value={answer.text}
                    onChange={(e) => updateAnswer(answer.id, { text: e.target.value })}
                    placeholder={t("polls.answer")}
                    className="flex-1"
                    maxLength={100}
                  />

                  {/* Remove button — only when > 2 answers */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeAnswer(answer.id)}
                    disabled={answers.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add answer */}
            {answers.length < 10 && (
              <button
                type="button"
                onClick={addAnswer}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors mt-1"
              >
                <Plus className="h-4 w-4" />
                {t("polls.addAnswer")}
              </button>
            )}
          </div>

          {/* Settings row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Duration */}
            <div className="flex-1 min-w-[140px] space-y-1.5">
              <Label>{t("polls.duration")}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Allow multiple */}
            <div className="flex items-center gap-2 mt-5">
              <Checkbox
                id="allow-multiple"
                checked={allowMultiple}
                onCheckedChange={(v) => setAllowMultiple(!!v)}
              />
              <Label htmlFor="allow-multiple" className="cursor-pointer text-sm font-normal">
                {t("polls.allowMultiple")}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handlePost} disabled={!canPost || creating}>
            {creating ? "…" : t("polls.post")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePollModal;
