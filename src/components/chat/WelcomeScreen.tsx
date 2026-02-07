import { Sparkles } from 'lucide-react';
import anisiaAvatar from '@/assets/anisia-avatar.png';

interface WelcomeScreenProps {
  onStartChat: (prompt?: string) => void;
}

export function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-6">
        {/* Avatar & Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-primary/20">
            <img
              src={anisiaAvatar}
              alt="Anisia"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2">
              Cu ce te pot ajuta?
              <Sparkles className="h-5 w-5 text-primary" />
            </h1>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed max-w-md mx-auto">
              Sunt Anisia, asistentul tău AI pentru dezvoltare software, game development și inginerie de sistem.
            </p>
          </div>
        </div>

        {/* Quick hint */}
        <p className="text-xs text-muted-foreground/60">
          Scrie direct întrebarea ta în câmpul de mai jos
        </p>
      </div>
    </div>
  );
}
