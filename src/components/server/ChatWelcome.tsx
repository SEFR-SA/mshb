import React from "react";
import { Hash, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatWelcomeProps {
  channelName: string;
  description?: string | null;
  canEdit: boolean;
  onEdit?: () => void;
}

const ChatWelcome: React.FC<ChatWelcomeProps> = ({ channelName, description, canEdit, onEdit }) => {
  return (
    <div className="mb-8 px-1 py-4">
      {/* Circle with # icon */}
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 shrink-0">
        <Hash className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-bold mb-2">Welcome to #{channelName}!</h1>

      {/* Description paragraph */}
      <p className="text-muted-foreground text-sm mb-4">
        This is the start of the #{channelName} channel.
        {description && ` ${description}`}
      </p>

      {/* Edit Channel button — admins/owners only */}
      {canEdit && onEdit && (
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Edit Channel
        </Button>
      )}
    </div>
  );
};

export default ChatWelcome;
