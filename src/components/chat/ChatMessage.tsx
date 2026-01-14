import { memo, useState, useMemo } from 'react';
import { User, Volume2, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import anisiaAvatar from '@/assets/anisia-avatar.png';
import { GameRenderer } from './GameRenderer';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
  isStreaming?: boolean;
  onSpeak?: () => void;
  isSpeaking?: boolean;
}

// Parse content to separate text and games
function parseContent(content: string): { type: 'text' | 'game'; content: string }[] {
  const parts: { type: 'text' | 'game'; content: string }[] = [];
  const gameRegex = /<game>([\s\S]*?)<\/game>/g;
  let lastIndex = 0;
  let match;

  while ((match = gameRegex.exec(content)) !== null) {
    // Add text before the game
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    // Add the game
    parts.push({ type: 'game', content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim();
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }
  }

  // If no games found, return the whole content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
}

// Simple markdown renderer
function renderMarkdown(content: string) {
  // Code blocks
  let html = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-secondary p-4 rounded-lg overflow-x-auto mb-3"><code class="text-sm font-mono">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mb-2 mt-4">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mb-2 mt-4">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-semibold mb-2 mt-4">$1</h1>');

  // Lists
  html = html.replace(/^\- (.+)$/gm, '<li class="ml-4">• $1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p class="mb-3">');

  // Single newlines
  html = html.replace(/\n/g, '<br/>');

  return `<p class="mb-3">${html}</p>`;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  imageUrl,
  isStreaming,
  onSpeak,
  isSpeaking
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const parsedContent = useMemo(() => parseContent(content), [content]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `anisia-image-${Date.now()}.png`;
    link.click();
  };

  return (
    <div
      className={cn(
        "flex gap-4 p-4 animate-fade-in",
        role === 'user' ? "bg-transparent" : "bg-anisia-surface"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {role === 'assistant' ? (
          <div className="w-8 h-8 rounded-full overflow-hidden anisia-glow">
            <img
              src={anisiaAvatar}
              alt="Anisia"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {role === 'assistant' ? 'Anisia' : 'Tu'}
          </span>
        </div>

        {/* Image if present */}
        {imageUrl && (
          <div className="mb-3 relative group">
            <img
              src={imageUrl}
              alt="Imagine generată"
              className="max-w-md rounded-lg border border-border"
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDownloadImage}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Parsed content (text and games) */}
        {parsedContent.map((part, index) => (
          <div key={index}>
            {part.type === 'game' ? (
              <GameRenderer gameCode={part.content} />
            ) : (
              <div
                className={cn(
                  "markdown-content text-foreground",
                  isStreaming && index === parsedContent.length - 1 && "typing-cursor"
                )}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(part.content) }}
              />
            )}
          </div>
        ))}

        {/* Actions for assistant messages */}
        {role === 'assistant' && !isStreaming && content && (
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? 'Copiat' : 'Copiază'}
            </Button>
            {onSpeak && (
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 px-2",
                  isSpeaking
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={onSpeak}
              >
                <Volume2 className="h-3 w-3 mr-1" />
                {isSpeaking ? 'Vorbește...' : 'Ascultă'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
