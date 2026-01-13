import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Eye, EyeOff, Key } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voiceEnabled: boolean;
  onVoiceChange: (enabled: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange, voiceEnabled, onVoiceChange }: SettingsDialogProps) {
  const { user } = useAuth();
  const [perplexityKey, setPerplexityKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadSettings();
    }
  }, [open, user]);

  const loadSettings = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setPerplexityKey(data.perplexity_api_key || '');
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          voice_enabled: voiceEnabled,
          perplexity_api_key: perplexityKey || null
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success('Settings saved successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Voice Settings */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Voice Output</Label>
              <p className="text-sm text-muted-foreground">
                Anisia will read responses aloud
              </p>
            </div>
            <Switch
              checked={voiceEnabled}
              onCheckedChange={onVoiceChange}
            />
          </div>

          {/* Perplexity API Key */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Key className="h-4 w-4" />
              Perplexity API Key (Optional)
            </Label>
            <p className="text-sm text-muted-foreground">
              Add your free Perplexity API key to enable web search.
              <a
                href="https://www.perplexity.ai/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                Get a free key
              </a>
            </p>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={perplexityKey}
                onChange={(e) => setPerplexityKey(e.target.value)}
                placeholder="pplx-..."
                className="pr-10 bg-input border-border"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Account Info */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Logged in as: <span className="text-foreground">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
