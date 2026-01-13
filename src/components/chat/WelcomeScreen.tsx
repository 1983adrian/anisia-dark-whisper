import { Sparkles, BookOpen, Code2, Image, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import anisiaAvatar from '@/assets/anisia-avatar.png';

interface WelcomeScreenProps {
  onStartChat: (prompt?: string) => void;
}

const suggestions = [
  {
    icon: BookOpen,
    title: "Ajutor la teme",
    prompt: "Ajută-mă să rezolv o problemă de matematică pentru bacalaureat"
  },
  {
    icon: Code2,
    title: "Învață programare",
    prompt: "Vreau să învăț să programez în Python, de unde să încep?"
  },
  {
    icon: Image,
    title: "Generează imagini",
    prompt: "Generează o imagine cu un peisaj montan din România"
  },
  {
    icon: Search,
    title: "Caută informații",
    prompt: "Ce s-a întâmplat în istorie în ziua de azi?"
  }
];

export function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Avatar & Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full overflow-hidden anisia-glow animate-pulse">
            <img
              src={anisiaAvatar}
              alt="Anisia"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
              Bun venit! Sunt Anisia
              <Sparkles className="h-6 w-6 text-primary" />
            </h1>
            <p className="text-muted-foreground mt-2">
              Asistentul tău AI pentru educație și programare
            </p>
          </div>
        </div>

        {/* Suggestions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex items-start gap-3 text-left bg-card hover:bg-anisia-hover border-border transition-smooth"
              onClick={() => onStartChat(suggestion.prompt)}
            >
              <suggestion.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-foreground block">
                  {suggestion.title}
                </span>
                <span className="text-sm text-muted-foreground line-clamp-2">
                  {suggestion.prompt}
                </span>
              </div>
            </Button>
          ))}
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground pt-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Curriculum românesc
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Programare avansată
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Generare imagini
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            Voce naturală
          </span>
        </div>
      </div>
    </div>
  );
}
