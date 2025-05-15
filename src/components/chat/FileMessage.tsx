import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Clock, AlertCircle, Download, FileText, File, Trash } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FileMessageProps {
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
    file_url?: string;
    file_name?: string;
    file_size?: number;
    is_deleted?: boolean;
  };
  isOwn: boolean;
  showSender: boolean;
  showTimestamp: boolean;
  onRecall?: (messageId: string) => void;
}

const FileMessage: React.FC<FileMessageProps> = ({
  message,
  isOwn,
  showSender,
  showTimestamp,
  onRecall
}) => {
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  
  // Get status icon
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-error-500" />;
      default:
        return null;
    }
  };

  // Get file icon based on extension
  const getFileIcon = () => {
    if (!message.file_name) return <File className="h-8 w-8 text-gray-400" />;
    
    const extension = message.file_name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="h-8 w-8 text-green-500" />;
      case 'ppt':
      case 'pptx':
        return <FileText className="h-8 w-8 text-orange-500" />;
      case 'zip':
      case 'rar':
        return <File className="h-8 w-8 text-purple-500" />;
      default:
        return <File className="h-8 w-8 text-gray-400" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleRecallMessage = () => {
    if (onRecall) {
      onRecall(message.id);
      setShowRecallConfirm(false);
    }
  };

  // If message is deleted, show a different UI
  if (message.is_deleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showSender ? 'mt-4' : 'mt-1'}`}
      >
        <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-4 py-2 rounded-2xl break-words ${
              isOwn
                ? 'bg-gray-300 dark:bg-dark-400 text-gray-500 dark:text-gray-400 rounded-br-none'
                : 'bg-gray-200 dark:bg-dark-300 text-gray-500 dark:text-gray-400 rounded-bl-none'
            } italic text-sm`}
          >
            This file was deleted
          </div>
          
          {showTimestamp && (
            <div className="flex items-center mt-1 text-xs text-gray-400 space-x-1">
              <span>
                {format(new Date(message.created_at), 'HH:mm')}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showSender ? 'mt-4' : 'mt-1'} group`}
    >
      {/* Avatar for other user's message */}
      {!isOwn && showSender && (
        <Link to={`/profile/${message.sender.id}`} className="flex-shrink-0 mr-2 mt-1">
          <img
            src={message.sender.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${message.sender.username}`}
            alt={message.sender.username}
            className="w-8 h-8 rounded-full"
          />
        </Link>
      )}

      <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isOwn && showSender && (
          <Link 
            to={`/profile/${message.sender.id}`}
            className="text-xs text-gray-500 dark:text-gray-400 ml-2 mb-1 hover:underline"
          >
            {message.sender.full_name || message.sender.username}
          </Link>
        )}
        
        {/* File content */}
        <div className="relative">
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            download={message.file_name}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
              isOwn
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-300'
            } transition-colors`}
          >
            <div className="flex-shrink-0">
              {getFileIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm truncate ${
                isOwn ? 'text-white' : 'text-gray-800 dark:text-gray-200'
              }`}>
                {message.file_name || 'File'}
              </p>
              <p className={`text-xs ${
                isOwn ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {formatFileSize(message.file_size)}
              </p>
            </div>
            
            <Download className={`h-5 w-5 flex-shrink-0 ${
              isOwn ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
            }`} />
          </a>
          
          {/* Recall button (only for own messages) */}
          {isOwn && (
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              {showRecallConfirm ? (
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleRecallMessage}
                    className="p-1 rounded-full bg-error-100 text-error-600 hover:bg-error-200"
                    title="Confirm delete"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={() => setShowRecallConfirm(false)}
                    className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                    title="Cancel"
                  >
                    <AlertCircle className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowRecallConfirm(true)}
                  className="p-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-error-600"
                  title="Delete message for everyone"
                >
                  <Trash className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Timestamp and status */}
        {showTimestamp && (
          <div className="flex items-center mt-1 text-xs text-gray-400 space-x-1">
            <span>
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
            
            {isOwn && message.status && (
              <span className="ml-1">
                {getStatusIcon()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Avatar for own message */}
      {isOwn && showSender && (
        <Link to={`/profile/${message.sender.id}`} className="flex-shrink-0 ml-2 mt-1">
          <img
            src={message.sender.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${message.sender.username}`}
            alt={message.sender.username}
            className="w-8 h-8 rounded-full"
          />
        </Link>
      )}
    </motion.div>
  );
};

export default FileMessage;