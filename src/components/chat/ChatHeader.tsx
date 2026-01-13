import { Menu, Volume2, VolumeX, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import anisiaAvatar from '@/assets/anisia-avatar.png';

interface ChatHeaderProps {
  title?: string;
  onToggleSidebar: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function ChatHeader({
  title = 'Anisia',
  onToggleSidebar,
  voiceEnabled,
  onToggleVoice,
  isSpeaking,
  isPaused,
  onPause,
  onResume,
  onStop
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="ghost"
          className="lg:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden anisia-glow">
            <img
              src={anisiaAvatar}
              alt="Anisia"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground">AI Assistant</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Voice Controls */}
        {isSpeaking && (
          <div className="flex items-center gap-1 mr-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={isPaused ? onResume : onPause}
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onStop}
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Voice Toggle */}
        <Button
          size="icon"
          variant={voiceEnabled ? "default" : "ghost"}
          className={cn(
            "h-8 w-8",
            voiceEnabled && "bg-primary hover:bg-primary/90"
          )}
          onClick={onToggleVoice}
          title={voiceEnabled ? "Disable voice" : "Enable voice"}
        >
          {voiceEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
