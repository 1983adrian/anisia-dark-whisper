import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, RotateCcw, Code2, ExternalLink, Save, Pencil, Globe, Link2, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProjects, Project } from '@/hooks/useProjects';
import { toast } from 'sonner';

interface CodePreviewProps {
  code: string;
  title?: string;
  existingProject?: Project | null;
  onProjectSaved?: (project: Project) => void;
  onEditRequest?: (project: Project) => void;
}

export const CodePreview = memo(function CodePreview({ code, title, existingProject, onProjectSaved, onEditRequest }: CodePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [savedProject, setSavedProject] = useState<Project | null>(existingProject || null);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { saveProject, updateProject, togglePublic } = useProjects();

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
    if (!isFullscreen) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const handleOpenExternal = () => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlDoc);
      win.document.close();
    }
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (savedProject) {
        // Update existing project
        const updated = await updateProject(savedProject.id, { code });
        if (updated) {
          setSavedProject(updated);
          onProjectSaved?.(updated);
          toast.success('Proiect actualizat! v' + (updated.version || savedProject.version + 1));
        }
      } else {
        // Create new project
        const projectTitle = title || `Proiect ${new Date().toLocaleDateString('ro-RO')}`;
        const result = await saveProject(code, projectTitle);
        if (result) {
          setSavedProject(result);
          onProjectSaved?.(result);
        }
      }
    } finally {
      setSaving(false);
    }
  }, [savedProject, code, title, saveProject, updateProject, onProjectSaved]);

  const handleTogglePublic = useCallback(async () => {
    if (!savedProject) return;
    await togglePublic(savedProject.id, !savedProject.is_public);
    setSavedProject(prev => prev ? { ...prev, is_public: !prev.is_public } : null);
  }, [savedProject, togglePublic]);

  const handleCopyLink = useCallback(() => {
    if (!savedProject) return;
    const url = `${window.location.origin}/p/${savedProject.slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success('Link copiat: ' + url);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [savedProject]);

  const handleEdit = useCallback(() => {
    if (savedProject && onEditRequest) {
      onEditRequest({ ...savedProject, code });
    }
  }, [savedProject, code, onEditRequest]);

  const handleDownload = useCallback(() => {
    const downloadBlob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = (savedProject?.title || title || 'proiect')
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '') + '.html';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Fișier descărcat: ' + fileName);
  }, [htmlDoc, savedProject, title]);

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
          <span className="truncate max-w-[150px]">{savedProject?.title || title || 'Preview Live'}</span>
          {savedProject && (
            <span className="text-xs opacity-60">v{savedProject.version}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {/* Save / Update */}
          <Button
            size="sm"
            variant={savedProject ? "outline" : "default"}
            className={cn("h-7 gap-1 px-2 text-xs")}
            onClick={handleSave}
            disabled={saving}
            title={savedProject ? "Actualizează proiectul" : "Salvează proiectul"}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? '...' : savedProject ? 'Actualizează' : 'Salvează'}
          </Button>

          {/* Public toggle */}
          {savedProject && (
            <Button
              size="sm"
              variant={savedProject.is_public ? "default" : "outline"}
              className={cn("h-7 gap-1 px-2 text-xs", savedProject.is_public && "bg-green-600 hover:bg-green-700 text-white")}
              onClick={handleTogglePublic}
              title={savedProject.is_public ? "Fă privat" : "Publică online"}
            >
              <Globe className="h-3.5 w-3.5" />
              {savedProject.is_public ? 'Public' : 'Publică'}
            </Button>
          )}

          {/* Copy link */}
          {savedProject?.is_public && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={handleCopyLink}
              title="Copiază linkul public"
            >
              {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {linkCopied ? 'Copiat!' : 'Link'}
            </Button>
          )}

          {/* Edit in chat */}
          {savedProject && onEditRequest && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={handleEdit} title="Editează în chat">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Download */}
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={handleDownload} title="Descarcă pe dispozitiv">
            <Download className="h-3.5 w-3.5" />
            Descarcă
          </Button>

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
