import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { SettingsDialog } from '@/components/chat/SettingsDialog';
import { TaskIndicator } from '@/components/chat/TaskIndicator';
import { AuthPage } from '@/components/auth/AuthPage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useVoice } from '@/hooks/useVoice';
import { useProjects, Project } from '@/hooks/useProjects';
import { useMemories } from '@/hooks/useMemories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    conversations, currentConversation, messages,
    createConversation, selectConversation, updateConversationTitle,
    deleteConversation, addMessage
  } = useConversations();
  
  const { voiceEnabled, setVoiceEnabled, toggleVoice, isSpeaking, isPaused, speak, pause, resume, stop } = useVoice();
  const { getRelevantMemories, saveMemory, formatMemoriesForContext } = useMemories();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Load project from URL params (?edit=projectId)
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && user) {
      (async () => {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .eq('id', editId)
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          const project = data as unknown as Project;
          setActiveProject(project);
          // Clear the param
          setSearchParams({}, { replace: true });
          // Auto-send edit context message
          toast.info(`Proiect încărcat: "${project.title}" — spune-i Irei ce vrei să schimbi!`);
        }
      })();
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleProjectSaved = useCallback((project: Project) => {
    setActiveProject(project);
  }, []);

  const handleEditProject = useCallback((project: Project) => {
    setActiveProject(project);
    toast.info(`Editezi "${project.title}" — scrie ce vrei schimbat!`);
  }, []);

  const formatProjectContextCode = useCallback((projectCode: string) => {
    // No truncation - send full project code
    return projectCode;
  }, []);

  const handleSendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!user) return;

    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createConversation(content.slice(0, 50));
      if (!conversation) return;
    }

    setIsStreaming(true);
    setStreamingContent('');
    
    try {
      const filesData: { type: string; data: string; name: string }[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          filesData.push({ type: file.type, data: base64, name: file.name });
        }
      }

      const firstImage = filesData.find(f => f.type.startsWith('image/'));
      await addMessage(conversation.id, 'user', content, firstImage?.data);

      // Send all messages for full conversation context
      const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));

      // Retrieve relevant memories
      const memories = await getRelevantMemories(content);
      const memoryContext = formatMemoriesForContext(memories);

      // If we have an active project, inject its context
      let enhancedContent = content;
      if (activeProject) {
        enhancedContent = `[CONTEXT PROIECT ACTIV: "${activeProject.title}" (ID: ${activeProject.id}, v${activeProject.version})]\n[CODUL ACTUAL AL PROIECTULUI:]\n\`\`\`html\n${formatProjectContextCode(activeProject.code)}\n\`\`\`\n\n[CEREREA UTILIZATORULUI:] ${content}`;
      }

      const currentMessage = [{ role: 'user', content: enhancedContent }];

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ messages: currentMessage, conversationHistory, files: filesData, memoryContext })
      });

      if (!response.ok) {
        if (response.status === 429) {
          const voiceMessage = 'Sunt prea multe cereri acum. Încearcă din nou peste câteva minute.';
          await addMessage(conversation.id, 'assistant', voiceMessage);
          if (voiceEnabled) speak(voiceMessage);
          return;
        }
        if (response.status === 402) {
          const voiceMessage = 'Momentan s-a atins limita de utilizare. Încearcă din nou mai târziu.';
          await addMessage(conversation.id, 'assistant', voiceMessage);
          if (voiceEnabled) speak(voiceMessage);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Eroare la comunicarea cu AI');
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const json = await response.json();
        const assistantMessage = json.content || json.message || json.text || '';
        if (assistantMessage) {
          await addMessage(conversation.id, 'assistant', assistantMessage);
          if (voiceEnabled) speak(assistantMessage);
        } else {
          throw new Error('Nu am primit un răspuns valid de la AI');
        }
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                assistantMessage += deltaContent;
                setStreamingContent(assistantMessage);
              }
            } catch { /* skip */ }
          }
        }
      }

      if (assistantMessage) {
        await addMessage(conversation.id, 'assistant', assistantMessage);
        setStreamingContent('');
        if (voiceEnabled) speak(assistantMessage);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Eroare la trimitere');
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [user, currentConversation, createConversation, addMessage, messages, voiceEnabled, speak, activeProject, formatProjectContextCode]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Se încarcă...</div>;
  if (!user) return <AuthPage />;

  return (
    <div className="flex h-screen h-[100dvh] bg-background overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}
      
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <ChatSidebar 
          conversations={conversations} 
          currentConversation={currentConversation} 
          onNewChat={() => { createConversation(); setActiveProject(null); setSidebarOpen(false); }} 
          onSelectConversation={(c) => { selectConversation(c); setSidebarOpen(false); }} 
          onDeleteConversation={deleteConversation} 
          onRenameConversation={updateConversationTitle} 
          onSignOut={() => {}} 
          onOpenSettings={() => setSettingsOpen(true)} 
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 w-full">
        <ChatHeader 
          title={activeProject ? `✏️ ${activeProject.title}` : (currentConversation?.title || 'Anisia')} 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          voiceEnabled={voiceEnabled} 
          onToggleVoice={toggleVoice} 
          isSpeaking={isSpeaking} 
          isPaused={isPaused} 
          onPause={pause} 
          onResume={resume} 
          onStop={stop} 
        />

        {/* Active project banner */}
        {activeProject && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
            <span className="text-sm text-primary font-medium">
              📝 Editezi: <strong>{activeProject.title}</strong> (v{activeProject.version})
            </span>
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setActiveProject(null)}
            >
              Închide proiectul
            </button>
          </div>
        )}

        {!currentConversation && messages.length === 0 ? (
          <WelcomeScreen onStartChat={(p) => p ? handleSendMessage(p) : createConversation()} />
        ) : (
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="max-w-3xl mx-auto px-4 py-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  enableTypewriter={false}
                  onSpeak={() => speak(msg.content)}
                  isSpeaking={isSpeaking}
                  activeProject={activeProject}
                  onProjectSaved={handleProjectSaved}
                  onEditProject={handleEditProject}
                />
              ))}
              {isStreaming && <TaskIndicator isActive={isStreaming} content={streamingContent} />}
              {isStreaming && streamingContent && (
                <ChatMessage
                  role="assistant"
                  content={streamingContent}
                  onSpeak={() => {}}
                  isSpeaking={false}
                  activeProject={activeProject}
                  onProjectSaved={handleProjectSaved}
                  onEditProject={handleEditProject}
                />
              )}
            </div>
          </ScrollArea>
        )}

        <ChatInput onSendMessage={handleSendMessage} disabled={false} />
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} voiceEnabled={voiceEnabled} onVoiceChange={setVoiceEnabled} />
    </div>
  );
}
