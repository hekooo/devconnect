import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Clock, AlertCircle, Trash } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MessageBubbleProps {
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
    is_deleted?: boolean;
  };
  isOwn: boolean;
  showSender: boolean;
  showTimestamp: boolean;
  onRecall?: (messageId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showSender,
  showTimestamp,
  onRecall
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  
  // Check if message contains a URL
  const containsUrl = /(https?:\/\/[^\s]+)/g.test(message.content);
  
  // Check if message contains an image URL
  const imageUrlMatch = message.content.match(/(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i);
  const hasImageUrl = !!imageUrlMatch;
  
  // Check if message contains a code block
  const codeBlockMatch = message.content.match(/```([^`]+)```/);
  const hasCodeBlock = !!codeBlockMatch;
  
  // Format message content with clickable links
  const formatMessageContent = () => {
    if (!containsUrl) return message.content;
    
    return message.content.replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary-600 dark:text-primary-400 underline">$1</a>'
    );
  };

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
            This message was deleted
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
        
        {/* Message content */}
        <div className="relative">
          <div
            className={`px-4 py-2 rounded-2xl break-words ${
              isOwn
                ? 'bg-primary-600 text-white rounded-br-none'
                : 'bg-gray-200 dark:bg-dark-300 text-gray-800 dark:text-gray-200 rounded-bl-none'
            } ${hasCodeBlock ? 'font-mono text-sm' : ''}`}
          >
            {hasImageUrl ? (
              <div className="space-y-2">
                <div 
                  className={`${isImageLoaded ? 'block' : 'hidden'} max-w-full rounded-lg overflow-hidden`}
                >
                  <img 
                    src={imageUrlMatch![0]} 
                    alt="Shared image" 
                    className="w-full h-auto"
                    onLoad={() => setIsImageLoaded(true)}
                  />
                </div>
                {!isImageLoaded && (
                  <div className="w-full h-32 bg-gray-300 dark:bg-dark-400 rounded-lg animate-pulse flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Loading image...</span>
                  </div>
                )}
                <p 
                  dangerouslySetInnerHTML={{ __html: formatMessageContent() }}
                  className={`${isOwn ? 'text-white' : 'text-gray-800 dark:text-gray-200'} break-words`}
                />
              </div>
            ) : hasCodeBlock ? (
              <pre className="whitespace-pre-wrap overflow-x-auto message-code">
                <code>{codeBlockMatch![1]}</code>
              </pre>
            ) : (
              <p 
                dangerouslySetInnerHTML={{ __html: formatMessageContent() }}
                className={`${isOwn ? 'text-white' : 'text-gray-800 dark:text-gray-200'} break-words`}
              />
            )}
          </div>
          
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

export default MessageBubble;