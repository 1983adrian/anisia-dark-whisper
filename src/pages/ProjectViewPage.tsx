import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2, Code2, ExternalLink, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Project {
  id: string;
  title: string;
  description: string | null;
  code: string;
  slug: string;
  is_public: boolean;
  version: number;
  updated_at: string;
}

export default function ProjectViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function load() {
      if (!slug) { setNotFound(true); setLoading(false); return; }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProject(data as unknown as Project);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const createDocument = (raw: string) => {
    let html = raw.trim();
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #1a1a1a; min-height: 100vh; }
  </style>
</head>
<body>${html}</body>
</html>`;
    }
    return html;
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const handleOpenExternal = () => {
    if (!project) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(createDocument(project.code));
      win.document.close();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link copiat!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Se încarcă...</div>;

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
      <h1 className="text-2xl font-bold">Proiect negăsit</h1>
      <p className="text-muted-foreground">Acest proiect nu există sau este privat.</p>
      <Button onClick={() => navigate('/')}>Înapoi la chat</Button>
    </div>
  );

  if (!project) return null;

  const htmlDoc = createDocument(project.code);
  const blob = new Blob([htmlDoc], { type: 'text/html' });
  const previewUrl = URL.createObjectURL(blob);

  return (
    <div className="min-h-screen bg-background flex flex-col" ref={containerRef}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-foreground">{project.title}</h1>
            {project.description && <p className="text-xs text-muted-foreground">{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowCode(!showCode)} title="Vezi codul">
            <Code2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopyLink} title="Copiază link">
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleOpenExternal} title="Tab nou">
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Code panel */}
      {showCode && (
        <div className="max-h-72 overflow-auto bg-[#1e1e1e] p-4 border-b border-border">
          <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono">{project.code}</pre>
        </div>
      )}

      {/* Preview */}
      <iframe
        ref={iframeRef}
        src={previewUrl}
        className="flex-1 w-full border-0 bg-white"
        style={{ minHeight: isFullscreen ? 'calc(100vh - 56px)' : 'calc(100vh - 56px)' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title={project.title}
      />
    </div>
  );
}
