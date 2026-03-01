import { memo, useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, RotateCcw, Code2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodePreviewProps {
  code: string;
  title?: string;
}

export const CodePreview = memo(function CodePreview({ code, title }: CodePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const createDocument = (raw: string) => {
    let html = raw.trim();

    // If it's not a complete HTML document, wrap it
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      min-height: 100vh;
      line-height: 1.6;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`;
    }

    return html;
  };

  const htmlDoc = createDocument(code);
  const blob = new Blob([htmlDoc], { type: 'text/html' });
  const previewUrl = URL.createObjectURL(blob);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleOpenExternal = () => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlDoc);
      win.document.close();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-lg overflow-hidden border border-border bg-background",
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "my-3"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Code2 className="h-4 w-4 text-primary" />
          <span>{title || 'Preview Live'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowCode(!showCode)} title={showCode ? 'Ascunde codul' : 'Vezi codul'}>
            <Code2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setKey(k => k + 1)} title="Reîncarcă">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleOpenExternal} title="Deschide în tab nou">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleFullscreen} title={isFullscreen ? 'Ieși din fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Code view */}
      {showCode && (
        <div className="max-h-64 overflow-auto bg-[#1e1e1e] p-3 border-b border-border">
          <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono">{code}</pre>
        </div>
      )}

      {/* Live preview iframe */}
      <iframe
        key={key}
        ref={iframeRef}
        src={previewUrl}
        className={cn(
          "w-full border-0 bg-white",
          isFullscreen ? "h-[calc(100vh-44px)]" : "h-[450px] md:h-[550px]"
        )}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="Live Preview"
      />
    </div>
  );
});
