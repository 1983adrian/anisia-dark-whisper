import { useState, useRef, useEffect, useCallback } from 'react';
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
      // Convert files to base64
      const filesData: { type: string; data: string; name: string }[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          filesData.push({
            type: file.type,
            data: base64,
            name: file.name
          });
        }
      }

      // Add user message (show first image if any)
      const firstImage = filesData.find(f => f.type.startsWith('image/'));
      await addMessage(conversation.id, 'user', content, firstImage?.data);

      // Prepare conversation history (all previous messages)
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Current message
      const currentMessage = [{ role: 'user', content }];

      // Call chat API with files
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ 
          messages: currentMessage, 
          conversationHistory,
          files: filesData
        })
      });

      if (!response.ok) {
        // Handle rate limit errors
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
      
      // Handle JSON response (non-streaming)
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

      // Handle streaming SSE response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
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
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Save assistant message
      if (assistantMessage) {
        await addMessage(conversation.id, 'assistant', assistantMessage);
        setStreamingContent('');
        
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
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} enableTypewriter={true} onSpeak={() => speak(msg.content)} isSpeaking={isSpeaking} />
              ))}
                {/* Task indicator - shows what Anisia is doing */}
                {isStreaming && (
                  <TaskIndicator isActive={isStreaming} content={streamingContent} />
                )}
                
                {/* Streaming message */}
                {isStreaming && streamingContent && (
                  <ChatMessage role="assistant" content={streamingContent} onSpeak={() => {}} isSpeaking={false} />
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
