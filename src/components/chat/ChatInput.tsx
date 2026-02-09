import { useState, useRef, KeyboardEvent } from 'react';
import { ArrowUp, Image, X, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  preview?: string;
  type: 'image' | 'document' | 'other';
}

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSendMessage, disabled, placeholder = "Scrie un mesaj..." }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!message.trim() && uploadedFiles.length === 0) return;
    const files = uploadedFiles.map(uf => uf.file);
    onSendMessage(message.trim(), files.length > 0 ? files : undefined);
    setMessage('');
    setUploadedFiles([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getFileType = (file: File): 'image' | 'document' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf' || 
        file.type.includes('word') || 
        file.type.includes('document') ||
        file.type === 'text/plain' ||
        file.type === 'text/csv') return 'document';
    return 'other';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < Math.min(files.length, 10); i++) { // Max 10 files
      const file = files[i];
      const fileType = getFileType(file);
      
      const uploadedFile: UploadedFile = {
        file,
        type: fileType
      };

      // Generate preview for images
      if (fileType === 'image') {
        const reader = new FileReader();
        uploadedFile.preview = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      newFiles.push(uploadedFile);
    }

    setUploadedFiles(prev => [...prev, ...newFiles].slice(0, 10)); // Max 10 total
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: 'image' | 'document' | 'other') => {
    switch (type) {
      case 'document': return <FileText className="h-6 w-6 text-blue-400" />;
      case 'other': return <File className="h-6 w-6 text-gray-400" />;
      default: return null;
    }
  };

  return (
    <div className="border-t border-border bg-background py-4 px-4">
      <div className="max-w-3xl mx-auto">
        {/* File previews */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedFiles.map((uf, index) => (
              <div key={index} className="relative group">
                {uf.type === 'image' && uf.preview ? (
                  <img 
                    src={uf.preview} 
                    alt={uf.file.name} 
                    className="h-16 w-16 object-cover rounded-lg border border-border" 
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-border bg-[#2f2f2f] flex flex-col items-center justify-center p-1">
                    {getFileIcon(uf.type)}
                    <span className="text-[8px] text-muted-foreground truncate w-full text-center mt-1">
                      {uf.file.name.slice(0, 8)}...
                    </span>
                  </div>
                )}
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {uploadedFiles.length > 0 && (
              <div className="text-xs text-muted-foreground self-end mb-1">
                {uploadedFiles.length}/10 fișiere
              </div>
            )}
          </div>
        )}

        <div className="relative flex items-end bg-[#2f2f2f] rounded-2xl border border-[#424242]">
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*,.pdf,.doc,.docx,.txt,.csv"
            multiple
            className="hidden" 
            onChange={handleFileSelect} 
          />
          
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 text-muted-foreground hover:text-foreground shrink-0 ml-1"
            onClick={() => fileInputRef.current?.click()}
            title="Adaugă imagini sau documente (max 10)"
          >
            <Image className="h-5 w-5" />
          </Button>

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent py-3 px-2",
              "focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground"
            )}
            rows={1}
          />

          <Button
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 mr-2 mb-2 rounded-lg transition-all",
              message.trim() || uploadedFiles.length > 0 ? "bg-white text-black" : "bg-[#424242] text-muted-foreground"
            )}
            onClick={handleSubmit}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
