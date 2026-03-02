import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  code: string;
  slug: string;
  is_public: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setProjects(data as unknown as Project[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchProjects();
    else setProjects([]);
  }, [user, fetchProjects]);

  const saveProject = async (code: string, title: string, description?: string): Promise<Project | null> => {
    if (!user) {
      toast.error('Trebuie să fii autentificat');
      return null;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        code,
        is_public: false,
      })
      .select()
      .single();

    if (error) {
      toast.error('Eroare la salvare: ' + error.message);
      return null;
    }

    const project = data as unknown as Project;
    setProjects(prev => [project, ...prev]);
    toast.success('Proiect salvat!');
    return project;
  };

  const updateProject = async (id: string, updates: Partial<Pick<Project, 'title' | 'description' | 'code' | 'is_public'>>) => {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, version: undefined })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Eroare la actualizare');
      return null;
    }

    // Also increment version via raw update
    await supabase.from('projects').update({ version: (data as any).version + 1 } as any).eq('id', id);

    const project = data as unknown as Project;
    setProjects(prev => prev.map(p => p.id === id ? project : p));
    toast.success('Proiect actualizat!');
    return project;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Eroare la ștergere');
      return;
    }

    setProjects(prev => prev.filter(p => p.id !== id));
    toast.success('Proiect șters');
  };

  const togglePublic = async (id: string, isPublic: boolean) => {
    const { error } = await supabase
      .from('projects')
      .update({ is_public: isPublic })
      .eq('id', id);

    if (error) {
      toast.error('Eroare la schimbarea vizibilității');
      return;
    }

    setProjects(prev => prev.map(p => p.id === id ? { ...p, is_public: isPublic } : p));
    toast.success(isPublic ? 'Proiect public — linkul e activ!' : 'Proiect privat');
  };

  const getPublicProject = async (slug: string): Promise<Project | null> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .eq('is_public', true)
      .single();

    if (error || !data) return null;
    return data as unknown as Project;
  };

  return {
    projects,
    loading,
    fetchProjects,
    saveProject,
    updateProject,
    deleteProject,
    togglePublic,
    getPublicProject,
  };
}
