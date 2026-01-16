import { Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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

        {/* Quick Actions */}
        <div className="pt-4">
          <Link to="/predictions">
            <Button variant="outline" className="gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Predicții Zilnice Fotbal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
