import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Copy,
  Check as CheckIcon,
  Trash,
  X as CloseIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../contexts/ThemeContext';
import { getUserAvatar } from '../../utils/avatar';

interface CodeSnippetMessageProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    sender: {
      id: string;
      username: string;
      avatar_url: string;
      full_name?: string;
    };
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    language?: string;
    is_deleted?: boolean;
  };
  isOwn: boolean;
  showSender: boolean;
  showTimestamp: boolean;
  onRecall?: (messageId: string) => void;
}

const CodeSnippetMessage: React.FC<CodeSnippetMessageProps> = ({
  message,
  isOwn,
  showSender,
  showTimestamp,
  onRecall
}) => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Render status icon
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':     return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent':        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':   return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':        return <CheckCheck className="h-3 w-3 text-primary-500" />;
      case 'failed':      return <AlertCircle className="h-3 w-3 text-error-500" />;
      default:            return null;
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Recall (delete) message
  const handleRecallMessage = () => {
    onRecall?.(message.id);
    setShowRecallConfirm(false);
  };

  // Deleted placeholder
  if (message.is_deleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showSender ? 'mt-3' : 'mt-1'} px-2 sm:px-3`}
      >
        <div className={`w-full max-w-full sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          <div className={`rounded-lg overflow-hidden w-full ${
            isOwn ? 'bg-gray-300 dark:bg-dark-400 text-gray-500' : 'bg-gray-200 dark:bg-dark-300 text-gray-500'
          }`}>
            <div className={`px-3 py-2 flex items-center justify-between text-xs ${
              isOwn ? 'bg-gray-400 dark:bg-dark-500' : 'bg-gray-300 dark:bg-dark-400'
            }`}>
              <span className="italic text-xs">This code snippet was deleted</span>
            </div>
          </div>
          {showTimestamp && (
            <div className="flex items-center mt-1 text-xs text-gray-400">
              {format(new Date(message.created_at), 'HH:mm')}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Prepare preview: first 5 lines
  const lines = message.content.split('\n');
  const preview = lines.slice(0, 5).join('\n');

  return (
    <>
      {/* MAIN BUBBLE */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showSender ? 'mt-3' : 'mt-1'} px-2 sm:px-3 group`}
      >
        {!isOwn && showSender && (
          <Link to={`/profile/${message.sender.id}`} className="hidden sm:flex mr-2 mt-1">
            <img
              src={getUserAvatar(message.sender.avatar_url, message.sender.username)}
              alt={message.sender.username}
              className="w-8 h-8 rounded-full"
            />
          </Link>
        )}

        <div className={`w-full max-w-full sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && showSender && (
            <Link to={`/profile/${message.sender.id}`} className="text-xs text-gray-500 mb-1 hover:underline">
              {message.sender.full_name || message.sender.username}
            </Link>
          )}
          
          {/* CODE PREVIEW */}
          <div className="relative rounded-lg overflow-hidden w-full shadow-sm hover:shadow-md transition-shadow">
            <div className={`px-3 py-2 flex items-center justify-between text-xs ${
              isOwn ? 'bg-primary-700 text-white' : 'bg-gray-100 dark:bg-dark-300 text-gray-700'
            }`}>
              <span className="font-medium truncate">{message.language || 'Code'}</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleCopy}
                  className="p-1 rounded-full hover:bg-black/10 transition"
                  aria-label="Copy code"
                >
                  {copied ? <CheckIcon className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
                </button>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-2 py-1 text-xs font-semibold rounded bg-primary-600 text-white hover:bg-primary-700 transition"
                >
                  View more
                </button>
              </div>
            </div>
            <div className="px-3 py-2 bg-white dark:bg-dark-200 max-h-[150px] overflow-hidden">
              <SyntaxHighlighter
                language={message.language || 'javascript'}
                style={theme === 'dark' ? atomDark : oneLight}
                customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '0.8rem', lineHeight: '1.3' }}
                showLineNumbers={false}
              >
                {preview}
                {lines.length > 5 ? '\n...' : ''}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* RECALL BUTTON */}
          {isOwn && (
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              {showRecallConfirm ? (
                <div className="flex items-center space-x-1">
                  <button onClick={handleRecallMessage} className="p-1 rounded-full bg-error-100 text-error-600">
                    <Check className="h-3 w-3"/>
                  </button>
                  <button onClick={() => setShowRecallConfirm(false)} className="p-1 rounded-full bg-gray-100">
                    <AlertCircle className="h-3 w-3"/>
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowRecallConfirm(true)} className="p-1 rounded-full bg-gray-100 text-gray-500 hover:text-error-600">
                  <Trash className="h-3 w-3"/>
                </button>
              )}
            </div>
          )}

          {/* TIMESTAMP & STATUS */}
          {showTimestamp && (
            <div className="flex items-center mt-1 text-xs text-gray-400 space-x-1">
              <span>{format(new Date(message.created_at), 'HH:mm')}</span>
              {isOwn && message.status && <span>{getStatusIcon()}</span>}
            </div>
          )}
        </div>

        {isOwn && showSender && (
          <Link to={`/profile/${message.sender.id}`} className="hidden sm:flex ml-2 mt-1">
            <img
              src={getUserAvatar(message.sender.avatar_url, message.sender.username)}
              alt={message.sender.username}
              className="w-8 h-8 rounded-full"
            />
          </Link>
        )}
      </motion.div>

      {/* FULL-CODE MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white dark:bg-dark-500 rounded-2xl shadow-2xl w-[90%] md:w-3/4 lg:w-2/3 max-h-[90%] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-dark-400">
                <h3 className="text-lg font-semibold">{message.language || 'Full Code'}</h3>
                <button onClick={() => setModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-400">
                  <CloseIcon className="h-5 w-5"/>
                </button>
              </div>

              {/* Code Editor Area */}
              <div className="flex-1 overflow-auto">
                <SyntaxHighlighter
                  language={message.language || 'javascript'}
                  style={theme === 'dark' ? atomDark : oneLight}
                  customStyle={{ margin: 0, padding: '16px', fontSize: '0.85rem', background: 'transparent' }}
                  showLineNumbers
                >
                  {message.content}
                </SyntaxHighlighter>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CodeSnippetMessage;