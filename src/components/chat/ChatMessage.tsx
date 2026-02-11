import { memo, useState, useMemo, useCallback } from 'react';
import { Volume2, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import anisiaAvatar from '@/assets/anisia-avatar.png';
import { GameRenderer } from './GameRenderer';
import { useTypewriter } from '@/hooks/useTypewriter';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
  isStreaming?: boolean;
  enableTypewriter?: boolean;
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
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    parts.push({ type: 'game', content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim();
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Enhanced markdown renderer - code blocks get a copy button via data attributes
function renderMarkdown(content: string) {
  let codeBlockIndex = 0;
  
  // Code blocks with copy button
  let html = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    const idx = codeBlockIndex++;
    const trimmedCode = code.trim();
    return `<div class="code-block-wrapper group/code" data-code-index="${idx}">
      <div class="code-header">
        ${langLabel}
        <button class="copy-code-btn" data-code="${encodeURIComponent(trimmedCode)}" title="Copiază codul">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </button>
      </div>
      <pre class="code-block"><code>${escapeHtml(trimmedCode)}</code></pre>
    </div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-foreground">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>');
  
  // Lists
  html = html.replace(/^\- (.+)$/gm, '<li class="list-item">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="list-item-numbered">$1</li>');
  
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-3 border-primary pl-4 my-2 text-muted-foreground italic">$1</blockquote>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline font-medium" target="_blank" rel="noopener">$1</a>');
  
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-4 border-border" />');
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p class="mb-3">');
  html = html.replace(/\n/g, '<br/>');

  return `<div class="prose-content"><p class="mb-3">${html}</p></div>`;
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  imageUrl,
  isStreaming,
  enableTypewriter = false,
  onSpeak,
  isSpeaking
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

  // Handle clicks on copy-code buttons inside rendered HTML
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest('.copy-code-btn') as HTMLElement | null;
    if (copyBtn) {
      e.preventDefault();
      const encodedCode = copyBtn.getAttribute('data-code');
      if (encodedCode) {
        const code = decodeURIComponent(encodedCode);
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
          }, 2000);
        });
      }
    }
  }, []);

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

            <div className="text-foreground break-words overflow-hidden" onClick={handleContentClick}>
              {parsedContent.map((part, index) => (
                <div key={index} className="overflow-hidden">
                  {part.type === 'game' ? (
                    <GameRenderer gameCode={part.content} />
                  ) : (
                    <div
                      className={cn(
                        "markdown-content leading-7 break-words overflow-wrap-anywhere",
                        showTypingCursor && index === parsedContent.length - 1 && "typing-cursor"
                      )}
                      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(part.content) }}
                    />
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
