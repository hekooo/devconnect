import React, { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Maximize2,
  X,
  Trash
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface ImageMessageProps {
  message: {
    id: string
    content: string
    created_at: string
    sender: {
      id: string
      username: string
      avatar_url: string
      full_name?: string
    }
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
    file_url?: string
    file_name?: string
    is_deleted?: boolean
  }
  isOwn: boolean
  showSender: boolean
  showTimestamp: boolean
  onRecall?: (messageId: string) => void
}

const ImageMessage: React.FC<ImageMessageProps> = ({
  message,
  isOwn,
  showSender,
  showTimestamp,
  onRecall
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showRecallConfirm, setShowRecallConfirm] = useState(false)

  const caption = message.content?.startsWith('[IMAGE] ')
    ? message.content.slice(8)
    : message.content

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary-500" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-error-500" />
      default:
        return null
    }
  }

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const toggleFullscreen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsFullscreen(prev => !prev)
    },
    [setIsFullscreen]
  )

  const handleRecallMessage = () => {
    if (onRecall) {
      onRecall(message.id)
      setShowRecallConfirm(false)
    }
  }

  // If message is deleted, show a different UI
  if (message.is_deleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${
          isOwn ? 'justify-end' : 'justify-start'
        } ${showSender ? 'mt-4' : 'mt-1'}`}
      >
        <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-4 py-2 rounded-2xl break-words ${
              isOwn
                ? 'bg-gray-300 dark:bg-dark-400 text-gray-500 dark:text-gray-400 rounded-br-none'
                : 'bg-gray-200 dark:bg-dark-300 text-gray-500 dark:text-gray-400 rounded-bl-none'
            } italic text-sm`}
          >
            This image was deleted
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
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${
          isOwn ? 'justify-end' : 'justify-start'
        } ${showSender ? 'mt-4' : 'mt-1'} group`}
      >
        {/* Avatar for other user's message */}
        {!isOwn && showSender && (
          <Link to={`/profile/${message.sender.id}`} className="flex-shrink-0 mr-2 mt-1">
            <img
              src={message.sender.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"}
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
          
          {/* Image content */}
          <div className="relative">
            <div
              className={`relative rounded-lg overflow-hidden ${
                isOwn
                  ? 'bg-primary-600'
                  : 'bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-300'
              }`}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-dark-300">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
                </div>
              )}

              {!hasError ? (
                <motion.img
                  key={message.file_url}
                  src={message.file_url}
                  alt={message.file_name || 'Shared image'}
                  className="max-w-full max-h-[300px] object-contain cursor-pointer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isLoading ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  onClick={toggleFullscreen}
                />
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Image could not be loaded
                </div>
              )}

              <button
                onClick={toggleFullscreen}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

            {caption && (
              <div
                className={`px-3 py-2 text-sm ${
                  isOwn ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {caption}
              </div>
            )}
            
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
            <div className="flex items-center mt-1 text-xs text-gray-400 space-x-1 ml-1">
              <span>{format(new Date(message.created_at), 'HH:mm')}</span>
              {isOwn && message.status && (
                <span className="ml-1">{getStatusIcon()}</span>
              )}
            </div>
          )}
        </div>

        {/* Avatar for own message */}
        {isOwn && showSender && (
          <Link
            to={`/profile/${message.sender.id}`}
            className="flex-shrink-0 ml-2 mt-1"
          >
            <img
              src={
                message.sender.avatar_url ||
                "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
              }
              alt={message.sender.username}
              className="w-8 h-8 rounded-full"
            />
          </Link>
        )}
      </motion.div>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={toggleFullscreen}
        >
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={message.file_url}
            alt={message.file_name || 'Shared image'}
            className="max-w-[90%] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </>
  )
}

export default ImageMessage