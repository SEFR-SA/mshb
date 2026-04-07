import * as React from "react";
import { format, startOfDay, isSameDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  minDate?: Date;
  minTime?: Date;
}

const TIME_SLOTS: { label: string; hours: number; minutes: number }[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const period = h >= 12 ? "PM" : "AM";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    TIME_SLOTS.push({
      label: `${display}:${m === 0 ? "00" : "30"} ${period}`,
      hours: h,
      minutes: m,
    });
  }
}

export function DateTimePicker({ value, onChange, placeholder = "Select date & time", minDate, minTime }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const activeRef = React.useRef<HTMLButtonElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const portalContainer =
    (triggerRef.current?.closest("[role='dialog'], [data-vaul-drawer]") as HTMLElement | null) ?? undefined;

  React.useEffect(() => {
    if (open) {
      setTimeout(() => activeRef.current?.scrollIntoView({ block: "center" }), 50);
    }
  }, [open]);

  const handleTimeListWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    if (container.scrollHeight <= container.clientHeight) return;
    event.preventDefault();
    event.stopPropagation();
    container.scrollTop += event.deltaY;
  };

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    const merged = new Date(day);
    if (value) {
      merged.setHours(value.getHours(), value.getMinutes(), 0, 0);
    } else {
      merged.setHours(12, 0, 0, 0);
    }
    onChange(merged);
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    const base = value ? new Date(value) : new Date();
    base.setHours(hours, minutes, 0, 0);
    onChange(base);
  };

  const isActiveSlot = (hours: number, minutes: number) =>
    !!value && value.getHours() === hours && value.getMinutes() === minutes;

  const isSlotDisabled = (hours: number, minutes: number) => {
    if (!minTime || !value) return false;
    if (!isSameDay(value, minTime)) return false;
    return hours < minTime.getHours() || (hours === minTime.getHours() && minutes <= minTime.getMinutes());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          className={cn(
            "w-full justify-start text-start font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="me-2 h-4 w-4" />
          {value ? format(value, "PPP 'at' p") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer}
        className="w-auto p-0 z-[10001]"
        align="start"
        sideOffset={4}
      >
        <div className="flex">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDaySelect}
            disabled={minDate ? { before: startOfDay(minDate) } : undefined}
            className="p-3 pointer-events-auto"
          />
          <div
            className="h-[300px] w-[120px] border-s border-border overflow-y-auto overscroll-contain"
            onWheelCapture={handleTimeListWheel}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="p-1">
              {TIME_SLOTS.map((slot) => {
                const active = isActiveSlot(slot.hours, slot.minutes);
                const disabled = isSlotDisabled(slot.hours, slot.minutes);
                return (
                  <button
                    key={slot.label}
                    ref={active ? activeRef : undefined}
                    onClick={() => !disabled && handleTimeSelect(slot.hours, slot.minutes)}
                    disabled={disabled}
                    className={cn(
                      "w-full rounded-md px-3 py-1.5 text-sm text-start transition-colors",
                      disabled
                        ? "opacity-50 pointer-events-none text-muted-foreground"
                        : active
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
