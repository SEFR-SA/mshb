import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Volume2, MapPin, Upload, X, ArrowLeft } from "lucide-react";
import ImageCropEditor from "./ImageCropEditor";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
}

interface VoiceChannel {
  id: string;
  name: string;
}

interface FormState {
  locationType: "voice" | "external";
  channelId: string;
  externalLocation: string;
  title: string;
  description: string;
  startDateTime: Date | undefined;
  endDateTime: Date | undefined;
  frequency: string;
  coverFile: File | null;
  coverPreview: string | null;
}

const initialForm: FormState = {
  locationType: "voice",
  channelId: "",
  externalLocation: "",
  title: "",
  description: "",
  startDateTime: undefined,
  endDateTime: undefined,
  frequency: "DOES_NOT_REPEAT",
  coverFile: null,
  coverPreview: null,
};

const CreateEventModal: React.FC<CreateEventModalProps> = ({ open, onOpenChange, serverId }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [voiceChannels, setVoiceChannels] = useState<VoiceChannel[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setForm(initialForm);
      return;
    }
    supabase
      .from("channels")
      .select("id, name")
      .eq("server_id", serverId)
      .eq("type", "voice")
      .order("position")
      .then(({ data }) => setVoiceChannels(data || []));
  }, [open, serverId]);

  const updateForm = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }));

  // Auto-correct: push endDateTime forward if it falls before startDateTime
  useEffect(() => {
    if (form.startDateTime && form.endDateTime && form.endDateTime <= form.startDateTime) {
      updateForm({ endDateTime: new Date(form.startDateTime) });
    }
  }, [form.startDateTime]);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateForm({ coverFile: file, coverPreview: URL.createObjectURL(file) });
  };

  const canProceedStep1 =
    form.locationType === "voice" ? !!form.channelId : form.externalLocation.trim().length > 0;

  const canProceedStep2 = form.title.trim().length > 0 && !!form.startDateTime;

  const handleSubmit = async () => {
    if (!user || !form.startDateTime) return;
    setSubmitting(true);
    try {
      let coverUrl: string | null = null;

      if (form.coverFile) {
        const ext = form.coverFile.name.split(".").pop();
        const path = `${serverId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("event_covers")
          .upload(path, form.coverFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("event_covers").getPublicUrl(path);
        coverUrl = urlData.publicUrl;
      }

      const startTime = form.startDateTime.toISOString();
      const endTime = form.endDateTime ? form.endDateTime.toISOString() : null;

      const { error } = await supabase.from("server_events").insert({
        server_id: serverId,
        creator_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_time: startTime,
        end_time: endTime,
        location_type: form.locationType as any,
        channel_id: form.locationType === "voice" ? form.channelId : null,
        external_location: form.locationType === "external" ? form.externalLocation.trim() : null,
        cover_image_url: coverUrl,
        status: "scheduled" as any,
        frequency: form.frequency as any,
      });

      if (error) throw error;

      toast({ title: "Event created!", description: `"${form.title}" has been scheduled.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed to create event", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 1 && "Where is your event?"}
            {step === 2 && "Event Details"}
            {step === 3 && "Review & Create"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <RadioGroup
              value={form.locationType}
              onValueChange={(v) => updateForm({ locationType: v as "voice" | "external" })}
              className="space-y-3"
            >
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 cursor-pointer transition-colors">
                <RadioGroupItem value="voice" />
                <Volume2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Voice Channel</p>
                  <p className="text-xs text-muted-foreground">Host in a voice channel</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 cursor-pointer transition-colors">
                <RadioGroupItem value="external" />
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Somewhere Else</p>
                  <p className="text-xs text-muted-foreground">Add a link or location</p>
                </div>
              </label>
            </RadioGroup>

            {form.locationType === "voice" && (
              <div className="space-y-2">
                <Label>Select a Channel</Label>
                <Select value={form.channelId} onValueChange={(v) => updateForm({ channelId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a voice channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        <span className="flex items-center gap-2">
                          <Volume2 className="h-3.5 w-3.5" />
                          {ch.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.locationType === "external" && (
              <div className="space-y-2">
                <Label>Location or Link</Label>
                <Input
                  placeholder="Add a location, link, or something..."
                  value={form.externalLocation}
                  onChange={(e) => updateForm({ externalLocation: e.target.value })}
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Topic *</Label>
              <Input
                placeholder="What is your event about?"
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Start Date & Time *</Label>
              <DateTimePicker
                value={form.startDateTime}
                onChange={(d) => updateForm({ startDateTime: d })}
                placeholder="Select start date & time"
              />
            </div>

            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <DateTimePicker
                value={form.endDateTime}
                onChange={(d) => updateForm({ endDateTime: d })}
                placeholder="Select end date & time"
                minDate={form.startDateTime}
                minTime={form.startDateTime}
              />
            </div>

            <div className="space-y-2">
              <Label>Event Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => updateForm({ frequency: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Does not repeat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOES_NOT_REPEAT">Does not repeat</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">
                    {form.startDateTime
                      ? `Weekly on ${form.startDateTime.toLocaleDateString(undefined, { weekday: "long" })}`
                      : "Weekly"}
                  </SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Annually</SelectItem>
                  <SelectItem value="WEEKDAYS">Every weekday (Monday to Friday)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Tell people more about your event..."
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                className="min-h-[80px]"
                maxLength={1000}
              />
            </div>

            <div className="space-y-2">
              <Label>Cover Image</Label>
              {form.coverPreview ? (
                <div className="relative">
                  <img src={form.coverPreview} alt="Cover" className="w-full h-32 object-cover rounded-lg" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => updateForm({ coverFile: null, coverPreview: null })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/20 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload Cover Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                </label>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border overflow-hidden">
              {form.coverPreview && (
                <img src={form.coverPreview} alt="Cover" className="w-full h-32 object-cover" />
              )}
              <div className="p-4 space-y-2">
                <p className="text-xs font-semibold text-primary uppercase">
                  {form.startDateTime
                    ? form.startDateTime.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      }) +
                      " — " +
                      form.startDateTime.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
                <h3 className="text-lg font-bold">{form.title}</h3>
                {form.description && (
                  <p className="text-sm text-muted-foreground">{form.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {form.locationType === "voice" ? (
                    <>
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>
                        {voiceChannels.find((c) => c.id === form.channelId)?.name || "Voice Channel"}
                      </span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{form.externalLocation}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventModal;
