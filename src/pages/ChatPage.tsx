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
  
  // Sidebar hidden by default
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSendMessage = useCallback(async (content: string, imageFile?: File) => {
    if (!user) return;

    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createConversation(content.slice(0, 50));
      if (!conversation) return;
    }

    setIsStreaming(true);
    setStreamingContent('');
    
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
        // If rate limited, use voice to respond
        if (response.status === 402 || response.status === 429) {
          const voiceMessage = "Momentan am atins limita de răspunsuri scrise, dar pot vorbi cu tine! Activează vocea mea și voi răspunde vocal.";
          await addMessage(conversation.id, 'assistant', voiceMessage);
          if (voiceEnabled) {
            speak(voiceMessage);
          }
          return;
        }
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
                const deltaContent = parsed.choices?.[0]?.delta?.content;
                if (deltaContent) {
                  assistantMessage += deltaContent;
                  setStreamingContent(assistantMessage);
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
        setStreamingContent('');
        
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
      setStreamingContent('');
    }
  }, [user, currentConversation, createConversation, addMessage, messages, voiceEnabled, speak]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Se încarcă...</div>;
  if (!user) return <AuthPage />;

  return (
    <div className="flex h-screen h-[100dvh] bg-background overflow-hidden">
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - hidden by default, slides in */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <ChatSidebar 
          conversations={conversations} 
          currentConversation={currentConversation} 
          onNewChat={() => { createConversation(); setSidebarOpen(false); }} 
          onSelectConversation={(c) => { selectConversation(c); setSidebarOpen(false); }} 
          onDeleteConversation={deleteConversation} 
          onRenameConversation={updateConversationTitle} 
          onSignOut={() => {}} 
          onOpenSettings={() => setSettingsOpen(true)} 
        />
      </div>

      {/* Main chat area - full width always */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <ChatHeader 
          title={currentConversation?.title || 'Anisia'} 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          voiceEnabled={voiceEnabled} 
          onToggleVoice={toggleVoice} 
          isSpeaking={isSpeaking} 
          isPaused={isPaused} 
          onPause={pause} 
          onResume={resume} 
          onStop={stop} 
        />

        {!currentConversation && messages.length === 0 ? (
          <WelcomeScreen onStartChat={(p) => p ? handleSendMessage(p) : createConversation()} />
        ) : (
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="max-w-3xl mx-auto px-4 py-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} onSpeak={() => speak(msg.content)} isSpeaking={isSpeaking} />
              ))}
              {isStreaming && streamingContent && (
                <ChatMessage role="assistant" content={streamingContent} onSpeak={() => {}} isSpeaking={false} />
              )}
              {isStreaming && !streamingContent && (
                <div className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  </div>
                  <span className="text-muted-foreground">Anisia scrie...</span>
                </div>
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
