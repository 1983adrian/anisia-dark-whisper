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
          <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/20">
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
          </div>
        </div>
      </div>
    </div>
  );
}
