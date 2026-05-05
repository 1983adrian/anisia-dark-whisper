import { memo, useState, useMemo } from 'react';
import { Volume2, Copy, Check, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import anisiaAvatar from '@/assets/anisia-avatar.png';
import { GameRenderer } from './GameRenderer';
import { CodePreview } from './CodePreview';
import { useTypewriter } from '@/hooks/useTypewriter';
import { Project } from '@/hooks/useProjects';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
  isStreaming?: boolean;
  enableTypewriter?: boolean;
  onSpeak?: () => void;
  isSpeaking?: boolean;
  activeProject?: Project | null;
  onProjectSaved?: (project: Project) => void;
  onEditProject?: (project: Project) => void;
}

// Parse content to separate text and games
function parseContent(content: string): { type: 'text' | 'game' | 'preview'; content: string }[] {
  const parts: { type: 'text' | 'game' | 'preview'; content: string }[] = [];
  const tagRegex = /<(game|preview)>([\s\S]*?)<\/\1>/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) parts.push({ type: 'text', content: textBefore });
    }
    parts.push({ type: match[1] as 'game' | 'preview', content: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim();
    if (remainingText) parts.push({ type: 'text', content: remainingText });
  }

  if (parts.length === 0) parts.push({ type: 'text', content });
  return parts;
}

function MarkdownBlock({ text }: { text: string }) {
  return (
    <div className="markdown-content prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            const codeText = String(children).replace(/\n$/, '');
            if (isInline) {
              return <code className="inline-code" {...props}>{children}</code>;
            }
            return (
              <div className="code-block-wrapper group/code">
                <div className="code-header">
                  {match && <span className="code-lang">{match[1]}</span>}
                  <button
                    className="copy-code-btn"
                    onClick={() => navigator.clipboard.writeText(codeText)}
                    title="Copiază codul"
                    type="button"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <pre className="code-block"><code>{codeText}</code></pre>
              </div>
            );
          },
          a({ children, href }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>;
          },
          table({ children }) {
            return <div className="overflow-x-auto"><table className="border-collapse">{children}</table></div>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage({
  role, content, imageUrl, isStreaming, enableTypewriter = false,
  onSpeak, isSpeaking, activeProject, onProjectSaved, onEditProject
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  
  const { displayedText, isTyping } = useTypewriter(content, {
    speed: 60,
    enabled: enableTypewriter && role === 'assistant'
  });
  
  const textToShow = enableTypewriter && role === 'assistant' ? displayedText : content;
  const parsedContent = useMemo(() => parseContent(textToShow), [textToShow]);
  const showTypingCursor = isTyping || isStreaming;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ira-image-${Date.now()}.png`;
    link.click();
  };

  // copy handled inline by MarkdownBlock now

  return (
    <div className="py-6 group overflow-hidden">
      <div className="max-w-full mx-auto px-4">
        <div className="flex gap-4 overflow-hidden">
          {role === 'assistant' && (
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img src={anisiaAvatar} alt="Ira" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className={cn("flex-1 min-w-0 overflow-hidden", role === 'user' && "ml-12")}>
            <div className="font-semibold text-sm mb-1 text-foreground">
              {role === 'assistant' ? 'Ira' : 'Tu'}
            </div>

            {imageUrl && (
              <div className="mb-3 relative group/image inline-block">
                <img src={imageUrl} alt="Imagine generată" className="max-w-md rounded-lg border border-border" />
                <Button size="icon" variant="secondary" className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity" onClick={handleDownloadImage}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="text-foreground break-words overflow-hidden">
              {parsedContent.map((part, index) => (
                <div key={index} className="overflow-hidden">
                  {part.type === 'game' ? (
                    <GameRenderer gameCode={part.content} />
                  ) : part.type === 'preview' ? (
                    <CodePreview
                      code={part.content}
                      existingProject={activeProject}
                      onProjectSaved={onProjectSaved}
                      onEditRequest={onEditProject}
                    />
                  ) : (
                    <div
                      className={cn(
                        "leading-7 break-words",
                        showTypingCursor && index === parsedContent.length - 1 && "typing-cursor"
                      )}
                      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      <MarkdownBlock text={part.content} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {role === 'assistant' && !isStreaming && !isTyping && content && (
              <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleCopy} title={copied ? 'Copiat!' : 'Copiază'}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                {onSpeak && (
                  <Button size="icon" variant="ghost" className={cn("h-8 w-8", isSpeaking ? "text-primary" : "text-muted-foreground hover:text-foreground")} onClick={onSpeak} title={isSpeaking ? 'Vorbește...' : 'Ascultă'}>
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
