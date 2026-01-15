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

  const handleSendMessage = useCallback(async (content: string, imageFile?: File) => {
    if (!user) return;

    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createConversation(content.slice(0, 50));
      if (!conversation) return;
    }

    setIsStreaming(true);
    
    try {
      // Convert image to base64 if present
      let imageData: string | undefined;
      if (imageFile) {
        const reader = new FileReader();
        imageData = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
      }

      // Add user message
      await addMessage(conversation.id, 'user', content, imageData);

      // Prepare messages for API
      const chatMessages = [
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
          imageUrl: m.image_url
        })),
        { role: 'user', content, imageUrl: imageData }
      ];

      // Call chat API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ messages: chatMessages, imageData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Eroare la comunicarea cu AI');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Save assistant message
      if (assistantMessage) {
        await addMessage(conversation.id, 'assistant', assistantMessage);
        
        // Speak if voice enabled
        if (voiceEnabled) {
          speak(assistantMessage);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Eroare la trimitere');
    } finally {
      setIsStreaming(false);
    }
  }, [user, currentConversation, createConversation, addMessage, messages, voiceEnabled, speak]);

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
