import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { SettingsDialog } from '@/components/chat/SettingsDialog';
import { AuthPage } from '@/components/auth/AuthPage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useVoice } from '@/hooks/useVoice';
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
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!user) return;

    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createConversation(content.slice(0, 50));
      if (!conversation) return;
    }

    setIsStreaming(true);
    try {
      await addMessage(conversation.id, 'user', content);
    } catch (error) {
      toast.error('Eroare la trimitere');
    } finally {
      setIsStreaming(false);
    }
  }, [user, currentConversation, createConversation, addMessage]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <AuthPage />;

  return (
    <div className="flex h-screen bg-background">
      <div className={cn("fixed inset-y-0 left-0 z-50 w-72 transition-transform lg:relative lg:translate-x-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <ChatSidebar conversations={conversations} currentConversation={currentConversation} onNewChat={() => createConversation()} onSelectConversation={selectConversation} onDeleteConversation={deleteConversation} onRenameConversation={updateConversationTitle} onSignOut={() => {}} onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader title={currentConversation?.title || 'Anisia'} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} voiceEnabled={voiceEnabled} onToggleVoice={toggleVoice} isSpeaking={isSpeaking} isPaused={isPaused} onPause={pause} onResume={resume} onStop={stop} />

        {!currentConversation && messages.length === 0 ? (
          <WelcomeScreen onStartChat={(p) => p ? handleSendMessage(p) : createConversation()} />
        ) : (
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="max-w-3xl mx-auto p-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} onSpeak={() => speak(msg.content)} isSpeaking={isSpeaking} />
              ))}
              {isStreaming && <div className="p-4 text-muted-foreground animate-pulse">Anisia scrie...</div>}
            </div>
          </ScrollArea>
        )}

        <ChatInput onSendMessage={handleSendMessage} disabled={false} />
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} voiceEnabled={voiceEnabled} onVoiceChange={setVoiceEnabled} />
    </div>
  );
}
