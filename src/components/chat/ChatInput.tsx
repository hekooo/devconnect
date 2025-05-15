import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Image as ImageIcon,
  Smile,
  Plus,
  Code,
  Paperclip,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import CodeEditor from './CodeEditor';
import supabase from '../../lib/supabase';

interface ChatInputProps {
  onSend: (
    message: string,
    type?: 'text' | 'code' | 'image' | 'file',
    options?: any
  ) => Promise<void> | void;
  onTyping: () => void;
  isSending?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onTyping,
  isSending = false
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { theme } = useTheme();

  const [message, setMessage] = useState('');
  const [rows, setRows] = useState(1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [isUploading, setIsUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Responsive check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        showAttachMenu &&
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, showAttachMenu]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    const lineCount = Math.min(5, Math.max(1, message.split('\n').length));
    const newHeight = lineCount * 24 + (lineCount - 1) * 8 + 16;
    textareaRef.current.style.height = `${newHeight}px`;
    setRows(lineCount);
  }, [message]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Typing indicator
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (value.trim() && !isComposing) {
      onTyping();
    }
    typingTimeoutRef.current = setTimeout(() => {}, 1000);
  };

  // Submit text
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isSending && !isComposing) {
      await onSend(message);
      setMessage('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      setRows(1);
      setShowEmojiPicker(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  // File/Image upload
  const handleFileUpload = async (file: File, type: 'image' | 'file') => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Create a new FileReader to get the file's content type
      const reader = new FileReader();
      const fileContentPromise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsArrayBuffer(file);
      });

      const fileContent = await fileContentPromise;
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${user.id}/${fileName}`;
      const bucket = type === 'image' ? 'chat-images' : 'chat-files';

      // Create a blob with the correct content type
      const blob = new Blob([fileContent as ArrayBuffer], { type: file.type });

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Send the message
      const tag = type === 'image' ? '[IMAGE]' : '[FILE]';
      await onSend(`${tag} ${file.name}`, type, {
        file_url: publicUrl,
        file_name: file.name,
        ...(type === 'file' ? { file_size: file.size } : {})
      });

      addToast({
        type: 'success',
        message: `${type === 'image' ? 'Image' : 'File'} uploaded successfully`
      });
    } catch (err) {
      console.error(`Error uploading ${type}:`, err);
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error during upload'
      });
    } finally {
      setIsUploading(false);
      setShowAttachMenu(false);
      if (type === 'image') imageInputRef.current!.value = '';
      else fileInputRef.current!.value = '';
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'image');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'file');
  };

  // Send code snippet
  const handleSendCode = async () => {
    if (!codeContent.trim()) {
      addToast({ type: 'error', message: 'Please enter code' });
      return;
    }
    await onSend(codeContent, 'code', { language: codeLanguage });
    setCodeContent('');
    setShowCodeEditor(false);
  };

  return (
    <div className="relative">
      {/* Code editor modal */}
      <AnimatePresence>
        {showCodeEditor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-0 right-0 mb-4 bg-white dark:bg-dark-200 rounded-lg shadow-lg border border-gray-200 dark:border-dark-300 overflow-hidden"
          >
            <div className="p-3 border-b border-gray-200 dark:border-dark-300 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary-500" />
                <h3 className="font-medium">Code Snippet</h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={codeLanguage}
                  onChange={e => setCodeLanguage(e.target.value)}
                  className="text-sm bg-gray-100 dark:bg-dark-300 border-0 rounded-md"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="csharp">C#</option>
                  <option value="cpp">C++</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="php">PHP</option>
                  <option value="ruby">Ruby</option>
                  <option value="swift">Swift</option>
                  <option value="kotlin">Kotlin</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="sql">SQL</option>
                  <option value="json">JSON</option>
                  <option value="xml">XML</option>
                  <option value="markdown">Markdown</option>
                  <option value="bash">Bash</option>
                  <option value="plaintext">Plain Text</option>
                </select>
                <button
                  onClick={() => setShowCodeEditor(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <CodeEditor
              value={codeContent}
              onChange={setCodeContent}
              language={codeLanguage}
              height="200px"
            />
            <div className="p-3 border-t border-gray-200 dark:border-dark-300 flex justify-end">
              <button
                onClick={handleSendCode}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send Code
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end gap-2">
          {/* Attach */}
          <div className="relative" ref={attachMenuRef}>
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 bg-white dark:bg-dark-200 rounded-lg shadow-lg border border-gray-200 dark:border-dark-300 overflow-hidden z-10 w-48"
                >
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-dark-300"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-dark-300"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <Paperclip className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span>File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      setShowCodeEditor(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-dark-300"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                      <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span>Code</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              rows={rows}
              placeholder="Type a message..."
              className="w-full min-h-[44px] max-h-[132px] py-2 px-3 pr-10 bg-gray-100 dark:bg-dark-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              style={{ lineHeight: '24px' }}
              disabled={isSending || isUploading}
            />
            <div className="absolute right-10 bottom-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.95 }}
              className={`absolute right-2 bottom-2 p-1.5 rounded-full transition-colors ${
                message.trim() && !isSending && !isUploading
                  ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              disabled={!message.trim() || isSending || isUploading}
            >
              {isSending || isUploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </motion.button>
          </div>
        </div>
      </form>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            ref={emojiPickerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`absolute bottom-full ${isMobile ? 'left-0 right-0' : 'right-0'} mb-2 z-10`}
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              autoFocusSearch={false}
              theme={theme === 'dark' ? 'dark' : 'light'}
              width={isMobile ? '100%' : 300}
              height={350}
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInput;