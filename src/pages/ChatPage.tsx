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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    conversations, currentConversation, messages,
    createConversation, selectConversation, updateConversationTitle,
    deleteConversation, addMessage, setMessages
  } = useConversations();
  
  const { voiceEnabled, setVoiceEnabled, toggleVoice, isSpeaking, isPaused, speak, pause, resume, stop } = useVoice();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleNewChat = async () => {
    await createConversation();
  };

  const handleSendMessage = useCallback(async (content: string, imageFile?: File) => {
    if (!user) return;

    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createConversation(content.slice(0, 50));
      if (!conversation) return;
    }

    // Convert image to base64 if present
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(imageFile);
      });
    }

    // Add user message
    await addMessage(conversation.id, 'user', content, imageUrl);

    // Update title if first message
    if (messages.length === 0) {
      await updateConversationTitle(conversation.id, content.slice(0, 50));
    }

    // Stream AI response
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const allMessages = [...messages, { role: 'user' as const, content, image_url: imageUrl }];
      
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages.map(m => ({ role: m.role, content: m.content, imageUrl: m.image_url })) }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Failed to get response');
      }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setStreamingContent(fullContent);
            }
          } catch {}
        }
      }

      // Check for image generation command
      const imageMatch = fullContent.match(/\[GENERATE_IMAGE:\s*(.+?)\]/);
      if (imageMatch) {
        const prompt = imageMatch[1];
        fullContent = fullContent.replace(/\[GENERATE_IMAGE:\s*.+?\]/, 'Generez imaginea...');
        setStreamingContent(fullContent);

        try {
          const imgResp = await fetch(IMAGE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });
          const imgData = await imgResp.json();
          if (imgData.imageUrl) {
            fullContent = fullContent.replace('Generez imaginea...', 'Iată imaginea generată:');
            await addMessage(conversation.id, 'assistant', fullContent, imgData.imageUrl);
          } else {
            fullContent = fullContent.replace('Generez imaginea...', 'Nu am putut genera imaginea.');
            await addMessage(conversation.id, 'assistant', fullContent);
          }
        } catch {
          fullContent = fullContent.replace('Generez imaginea...', 'Eroare la generarea imaginii.');
          await addMessage(conversation.id, 'assistant', fullContent);
        }
      } else {
        await addMessage(conversation.id, 'assistant', fullContent);
      }

      // Speak if voice enabled
      if (voiceEnabled && fullContent) {
        speak(fullContent);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [user, currentConversation, messages, createConversation, addMessage, updateConversationTitle, voiceEnabled, speak]);

  const handleStartChat = (prompt?: string) => {
    if (prompt) {
      handleSendMessage(prompt);
    } else {
      handleNewChat();
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <ChatSidebar
          conversations={conversations}
          currentConversation={currentConversation}
          onNewChat={handleNewChat}
          onSelectConversation={selectConversation}
          onDeleteConversation={deleteConversation}
          onRenameConversation={updateConversationTitle}
          onSignOut={() => {}}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
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

        {!currentConversation && messages.length === 0 && !isStreaming ? (
          <WelcomeScreen onStartChat={handleStartChat} />
        ) : (
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="max-w-3xl mx-auto">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  imageUrl={msg.image_url}
                  onSpeak={() => speak(msg.content)}
                  isSpeaking={isSpeaking}
                />
              ))}
              {isStreaming && streamingContent && (
                <ChatMessage
                  role="assistant"
                  content={streamingContent}
                  isStreaming
                />
              )}
            </div>
          </ScrollArea>
        )}

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isStreaming}
        />
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        voiceEnabled={voiceEnabled}
        onVoiceChange={setVoiceEnabled}
      />
    </div>
  );
}
