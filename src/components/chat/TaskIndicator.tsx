import { useState, useEffect } from 'react';
import { ChevronRight, FileCode, Brain, Sparkles, Search, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  type: 'thinking' | 'editing' | 'searching' | 'analyzing' | 'generating';
  title: string;
  description: string;
  file?: string;
}

interface TaskIndicatorProps {
  isActive: boolean;
  content?: string;
}

const taskIcons = {
  thinking: Brain,
  editing: FileCode,
  searching: Search,
  analyzing: Sparkles,
  generating: Wrench,
};

const taskColors = {
  thinking: 'text-purple-400',
  editing: 'text-blue-400',
  searching: 'text-green-400',
  analyzing: 'text-amber-400',
  generating: 'text-cyan-400',
};

// Analyze content to determine current task
function analyzeContent(content: string): Task[] {
  const tasks: Task[] = [];
  const lowerContent = content.toLowerCase();

  // Detect code blocks
  if (content.includes('```')) {
    const codeMatch = content.match(/```(\w+)?/);
    const lang = codeMatch?.[1] || 'code';
    tasks.push({
      id: 'code',
      type: 'editing',
      title: 'Scriu cod',
      description: `Generez ${lang === 'typescript' ? 'TypeScript' : lang === 'javascript' ? 'JavaScript' : lang === 'css' ? 'CSS' : 'cod'}`,
      file: lang,
    });
  }

  // Detect explanations about algorithms
  if (lowerContent.includes('algoritm') || lowerContent.includes('complexitate') || lowerContent.includes('o(n)')) {
    tasks.push({
      id: 'algo',
      type: 'analyzing',
      title: 'Analizez algoritm',
      description: 'Evaluez complexitatea și optimizările',
    });
  }

  // Detect Unity/Unreal mentions
  if (lowerContent.includes('unity') || lowerContent.includes('unreal')) {
    tasks.push({
      id: 'engine',
      type: 'generating',
      title: 'Game Engine',
      description: lowerContent.includes('unity') ? 'Lucrez cu Unity Engine' : 'Lucrez cu Unreal Engine',
    });
  }

  // Detect physics mentions
  if (lowerContent.includes('fizic') || lowerContent.includes('coliziuni') || lowerContent.includes('rigidbody')) {
    tasks.push({
      id: 'physics',
      type: 'analyzing',
      title: 'Simulez fizică',
      description: 'Calculez coliziuni și mișcare',
    });
  }

  // Detect shader/graphics
  if (lowerContent.includes('shader') || lowerContent.includes('grafic') || lowerContent.includes('render')) {
    tasks.push({
      id: 'graphics',
      type: 'generating',
      title: 'Grafică 3D',
      description: 'Procesez shadere și materiale',
    });
  }

  // Detect math
  if (lowerContent.includes('matrice') || lowerContent.includes('vector') || lowerContent.includes('quaternion')) {
    tasks.push({
      id: 'math',
      type: 'analyzing',
      title: 'Matematică 3D',
      description: 'Calculez transformări și rotații',
    });
  }

  return tasks.slice(0, 2); // Max 2 tasks shown
}

export function TaskIndicator({ isActive, content = '' }: TaskIndicatorProps) {
  const [thinkingTime, setThinkingTime] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Timer for thinking
  useEffect(() => {
    if (!isActive) {
      setThinkingTime(0);
      return;
    }

    const interval = setInterval(() => {
      setThinkingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Analyze content for tasks
  useEffect(() => {
    if (content) {
      const detected = analyzeContent(content);
      setTasks(detected);
    }
  }, [content]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col gap-2 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Thinking indicator */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
        <span>Gândesc de {thinkingTime}s</span>
      </div>

      {/* Task cards */}
      {tasks.map((task) => {
        const Icon = taskIcons[task.type];
        return (
          <div
            key={task.id}
            className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border border-border/50 animate-in fade-in slide-in-from-left-2 duration-200"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-foreground">{task.title}</span>
              {task.file && (
                <code className="px-2 py-0.5 bg-background rounded text-xs text-muted-foreground border border-border">
                  {task.file}
                </code>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        );
      })}

      {/* Default task if no specific ones detected */}
      {tasks.length === 0 && content.length > 10 && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border border-border/50">
          <div className="flex items-center gap-3">
            <span className="font-medium text-foreground">Generez răspuns</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {/* Processing indicator */}
      {tasks.length === 0 && content.length <= 10 && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border border-border/50">
          <div className="flex items-center gap-3">
            <span className="font-medium text-foreground">Procesez cererea</span>
          </div>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
}
