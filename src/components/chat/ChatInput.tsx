import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Image, Paperclip, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string, imageFile?: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSendMessage, disabled, placeholder = "Message Anisia..." }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if ((!message.trim() && !imageFile) || disabled) return;
    onSendMessage(message.trim(), imageFile || undefined);
    setMessage('');
    setImageFile(null);
    setImagePreview(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-3xl mx-auto">
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <img
              src={imagePreview}
              alt="Upload preview"
              className="h-20 rounded-lg border border-border"
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={removeImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-2 bg-input rounded-xl p-2 border border-border focus-within:ring-2 focus-within:ring-primary/50 transition-smooth">
          {/* File Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Image className="h-5 w-5" />
          </Button>

          {/* Text Input */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-muted-foreground"
            )}
            rows={1}
          />

          {/* Send Button */}
          <Button
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0 transition-smooth",
              (message.trim() || imageFile) && !disabled
                ? "bg-primary hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
            onClick={handleSubmit}
            disabled={(!message.trim() && !imageFile) || disabled}
          >
            {disabled ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-muted-foreground text-center mt-2">
          Anisia poate face greșeli. Verifică informațiile importante.
        </p>
      </div>
    </div>
  );
}
