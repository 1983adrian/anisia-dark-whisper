import { useState, useEffect } from 'react';
import { ChevronRight, FileCode, Brain, Sparkles, Code, Cpu, Database, Gamepad2, Palette, Bug, GitBranch } from 'lucide-react';

interface Task {
  id: string;
  type: 'thinking' | 'coding' | 'analyzing' | 'game' | 'graphics' | 'debug' | 'database';
  title: string;
  description: string;
  file?: string;
}

interface TaskIndicatorProps {
  isActive: boolean;
  content?: string;
}

const taskIcons: Record<string, any> = {
  thinking: Brain,
  coding: Code,
  analyzing: Cpu,
  game: Gamepad2,
  graphics: Palette,
  debug: Bug,
  database: Database,
};

// Analyze content to determine current tasks
function analyzeContent(content: string): Task[] {
  const tasks: Task[] = [];
  const lower = content.toLowerCase();

  // Detect code blocks with language
  const codeMatch = content.match(/```(\w+)/);
  if (codeMatch) {
    const lang = codeMatch[1];
    const langNames: Record<string, string> = {
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      python: 'Python',
      csharp: 'C#',
      cpp: 'C++',
      c: 'C',
      rust: 'Rust',
      lua: 'Lua',
      gdscript: 'GDScript',
      glsl: 'GLSL Shader',
      hlsl: 'HLSL Shader',
      sql: 'SQL',
      css: 'CSS',
      html: 'HTML',
    };
    tasks.push({
      id: 'code',
      type: 'coding',
      title: 'Scriu cod',
      description: langNames[lang] || lang.toUpperCase(),
      file: `*.${lang}`,
    });
  }

  // Game development
  if (lower.includes('unity') || lower.includes('unreal') || lower.includes('godot')) {
    const engine = lower.includes('unity') ? 'Unity' : lower.includes('unreal') ? 'Unreal' : 'Godot';
    tasks.push({
      id: 'game',
      type: 'game',
      title: 'Game Development',
      description: `Lucrez cu ${engine}`,
    });
  }

  // Physics & collision
  if (lower.includes('fizic') || lower.includes('coliziuni') || lower.includes('rigidbody') || lower.includes('raycast')) {
    tasks.push({
      id: 'physics',
      type: 'analyzing',
      title: 'Fizică de joc',
      description: 'Simulez coliziuni și mișcare',
    });
  }

  // Graphics & shaders
  if (lower.includes('shader') || lower.includes('render') || lower.includes('grafic') || lower.includes('material')) {
    tasks.push({
      id: 'graphics',
      type: 'graphics',
      title: 'Grafică 3D',
      description: 'Procesez shadere și materiale',
    });
  }

  // Algorithms
  if (lower.includes('algoritm') || lower.includes('sortare') || lower.includes('căutare') || lower.includes('o(n)')) {
    tasks.push({
      id: 'algo',
      type: 'analyzing',
      title: 'Algoritmi',
      description: 'Analizez complexitate și optimizări',
    });
  }

  // Math 3D
  if (lower.includes('matrice') || lower.includes('vector') || lower.includes('quaternion') || lower.includes('transform')) {
    tasks.push({
      id: 'math',
      type: 'analyzing',
      title: 'Matematică 3D',
      description: 'Calculez transformări',
    });
  }

  // Database
  if (lower.includes('database') || lower.includes('sql') || lower.includes('tabel') || lower.includes('query')) {
    tasks.push({
      id: 'db',
      type: 'database',
      title: 'Bază de date',
      description: 'Lucrez cu SQL/Database',
    });
  }

  // AI/ML
  if (lower.includes('behavior tree') || lower.includes('pathfinding') || lower.includes('navmesh') || lower.includes('a*')) {
    tasks.push({
      id: 'ai',
      type: 'analyzing',
      title: 'AI de joc',
      description: 'Implementez logică AI',
    });
  }

  // Debugging
  if (lower.includes('bug') || lower.includes('eroare') || lower.includes('debug') || lower.includes('fix')) {
    tasks.push({
      id: 'debug',
      type: 'debug',
      title: 'Debugging',
      description: 'Rezolv probleme de cod',
    });
  }

  return tasks.slice(0, 2);
}

export function TaskIndicator({ isActive, content = '' }: TaskIndicatorProps) {
  const [thinkingTime, setThinkingTime] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!isActive) {
      setThinkingTime(0);
      return;
    }
    const interval = setInterval(() => setThinkingTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (content) {
      setTasks(analyzeContent(content));
    }
  }, [content]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col gap-2 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Thinking header */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Brain className="w-4 h-4 text-primary animate-pulse" />
        <span>Gândesc de {thinkingTime}s</span>
      </div>

      {/* Dynamic tasks */}
      {tasks.map((task) => {
        const Icon = taskIcons[task.type] || Sparkles;
        return (
          <div
            key={task.id}
            className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border border-border/50 animate-in fade-in slide-in-from-left-2 duration-200"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">{task.title}</span>
              {task.file && (
                <code className="px-2 py-0.5 bg-background rounded text-xs text-muted-foreground border border-border">
                  {task.file}
                </code>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{task.description}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        );
      })}

      {/* Default processing state */}
      {tasks.length === 0 && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border border-border/50">
          <div className="flex items-center gap-3">
            <Code className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">
              {content.length > 20 ? 'Generez răspuns' : 'Procesez cererea'}
            </span>
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
