import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Lock, Trash2, ExternalLink, Copy, Check, Pencil, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/components/auth/AuthPage';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const { projects, loading, deleteProject, togglePublic } = useProjects();
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Se încarcă...</div>;
  if (!user) return <AuthPage />;

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const copyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Link copiat!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Proiectele Mele</h1>
            <p className="text-sm text-muted-foreground">Toate site-urile și aplicațiile construite de Ira</p>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Caută proiecte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-6"
        />

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Se încarcă proiectele...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-2">Niciun proiect salvat încă</p>
            <p className="text-sm text-muted-foreground">Cere-i Irei să construiască ceva și salvează-l!</p>
            <Button className="mt-4" onClick={() => navigate('/')}>Înapoi la chat</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((project) => (
              <Card key={project.id} className="p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{project.title}</h3>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  <Badge variant={project.is_public ? 'default' : 'secondary'} className="ml-2 shrink-0">
                    {project.is_public ? <><Globe className="h-3 w-3 mr-1" /> Public</> : <><Lock className="h-3 w-3 mr-1" /> Privat</>}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground mb-3">
                  v{project.version} • {new Date(project.updated_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/p/${project.slug}`)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Vezi
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePublic(project.id, !project.is_public)}
                  >
                    {project.is_public ? <Lock className="h-3.5 w-3.5 mr-1" /> : <Globe className="h-3.5 w-3.5 mr-1" />}
                    {project.is_public ? 'Fă privat' : 'Fă public'}
                  </Button>

                  {project.is_public && (
                    <Button size="sm" variant="outline" onClick={() => copyLink(project.slug, project.id)}>
                      {copiedId === project.id ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      {copiedId === project.id ? 'Copiat!' : 'Link'}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => { if (confirm('Ștergi proiectul?')) deleteProject(project.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
