import { Sparkles, Cloud, Shield, Database, Cpu, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import anisiaAvatar from '@/assets/anisia-avatar.png';

interface WelcomeScreenProps {
  onStartChat: (prompt?: string) => void;
}

export function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  const capabilities = [
    {
      icon: Cloud,
      label: "Cloud Architecture",
      prompt: "Ajută-mă să proiectez o arhitectură cloud scalabilă cu Kubernetes și Terraform pentru o aplicație enterprise.",
      color: "text-blue-400"
    },
    {
      icon: Shield,
      label: "Cybersecurity",
      prompt: "Vreau să fac un pentest pe aplicația mea web. Ce vulnerabilități OWASP Top 10 ar trebui să verific?",
      color: "text-red-400"
    },
    {
      icon: Database,
      label: "Data & ML Ops",
      prompt: "Cum pot configura un pipeline ETL cu Apache Airflow și un feature store pentru ML?",
      color: "text-green-400"
    },
    {
      icon: Cpu,
      label: "C++/Rust Low-Level",
      prompt: "Explică-mi cum să optimizez performanța în Rust cu zero-cost abstractions și async/await.",
      color: "text-orange-400"
    },
    {
      icon: Palette,
      label: "UX/UI Design",
      prompt: "Cum aplic principiile Gestalt și psihologia cognitivă pentru a îmbunătăți UX-ul aplicației mele?",
      color: "text-purple-400"
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center space-y-8">
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
            <p className="text-muted-foreground mt-2 text-sm">
              Software Engineering • Cloud • Security • Data • Design
            </p>
          </div>
        </div>

        {/* Capability Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
          {capabilities.map((cap) => (
            <Button
              key={cap.label}
              variant="outline"
              className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover:bg-accent/50 transition-colors"
              onClick={() => onStartChat(cap.prompt)}
            >
              <cap.icon className={`h-6 w-6 ${cap.color}`} />
              <span className="text-sm font-medium">{cap.label}</span>
            </Button>
          ))}
        </div>

        {/* Quick hint */}
        <p className="text-xs text-muted-foreground/60">
          Apasă pe o capabilitate pentru a începe sau scrie direct întrebarea ta
        </p>
      </div>
    </div>
  );
}
