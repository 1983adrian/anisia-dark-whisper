import { memo, useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, RotateCcw, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GameRendererProps {
  gameCode: string;
}

export const GameRenderer = memo(function GameRenderer({ gameCode }: GameRendererProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create a safe, sandboxed HTML document
  const createGameDocument = (code: string) => {
    // Extract just the HTML content from <game> tags if present
    let htmlContent = code;
    const gameMatch = code.match(/<game>([\s\S]*?)<\/game>/);
    if (gameMatch) {
      htmlContent = gameMatch[1];
    }

    // If it's not a complete HTML document, wrap it
    if (!htmlContent.includes('<!DOCTYPE') && !htmlContent.includes('<html')) {
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      background: #0a0a0a; 
      color: #ffffff; 
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow: hidden;
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    }

    // Add base styles if not present
    if (!htmlContent.includes('background') && htmlContent.includes('<style>')) {
      htmlContent = htmlContent.replace('<style>', `<style>
    body { background: #0a0a0a; color: #ffffff; }
  `);
    }

    return htmlContent;
  };

  const handleRestart = () => {
    setKey(prev => prev + 1);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const gameDocument = createGameDocument(gameCode);
  const blob = new Blob([gameDocument], { type: 'text/html' });
  const gameUrl = URL.createObjectURL(blob);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => URL.revokeObjectURL(gameUrl);
  }, [gameUrl]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-lg overflow-hidden border border-border bg-anisia-surface",
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "my-3"
      )}
    >
      {/* Game Header */}
      <div className="flex items-center justify-between p-2 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Gamepad2 className="h-4 w-4 text-primary" />
          <span>Joc Interactiv</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleRestart}
            title="Restart joc"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleFullscreen}
            title={isFullscreen ? "Ieși din fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Game iframe */}
      <iframe
        key={key}
        ref={iframeRef}
        src={gameUrl}
        className={cn(
          "w-full border-0",
          isFullscreen ? "h-[calc(100vh-44px)]" : "h-[400px] md:h-[500px]"
        )}
        sandbox="allow-scripts allow-same-origin"
        title="Game"
      />
    </div>
  );
});
