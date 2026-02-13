import { cn } from "@/lib/utils";

export type UserStatus = "online" | "busy" | "dnd" | "idle" | "invisible";

const statusColors: Record<UserStatus, string> = {
  online: "bg-green-500",
  busy: "bg-red-500",
  dnd: "bg-red-700",
  idle: "bg-yellow-500",
  invisible: "bg-gray-400",
};

interface StatusBadgeProps {
  status: UserStatus;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, size = "sm", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full inline-block shrink-0",
        size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
        statusColors[status] || statusColors.online,
        className
      )}
    />
  );
}
