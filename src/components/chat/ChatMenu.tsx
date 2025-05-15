import { motion } from 'framer-motion';
import { Trash2, Bell, BellOff, Pin, Archive, ArrowUpRight } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface ChatMenuProps {
  chat: any;
  onClose: () => void;
  onDelete: () => void;
  onPin: () => void;
  onMute: () => void;
  onArchive: () => void;
}

const ChatMenu = ({ chat, onClose, onDelete, onPin, onMute, onArchive }: ChatMenuProps) => {
  const { addToast } = useToast();

  const handleDelete = async () => {
    try {
      // Delete the chat
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chat.id);

      if (error) throw error;

      addToast({
        type: 'success',
        message: 'Chat deleted successfully'
      });

      onDelete();
    } catch (error) {
      console.error('Error deleting chat:', error);
      addToast({
        type: 'error',
        message: 'Failed to delete chat'
      });
    }
  };

  const handleMute = () => {
    onMute();
    addToast({
      type: 'success',
      message: chat.is_muted 
        ? 'Notifications unmuted for this chat' 
        : 'Notifications muted for this chat'
    });
  };

  const handlePin = () => {
    onPin();
    addToast({
      type: 'success',
      message: chat.is_pinned 
        ? 'Chat unpinned' 
        : 'Chat pinned to top'
    });
  };

  const handleArchive = () => {
    onArchive();
    addToast({
      type: 'success',
      message: chat.is_archived 
        ? 'Chat unarchived' 
        : 'Chat archived'
    });
  };

  const handleViewProfile = () => {
    if (chat.type === 'direct' && chat.other_member) {
      window.open(`/profile/${chat.other_member.id}`, '_blank');
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="mt-16 bg-white dark:bg-dark-200 rounded-lg shadow-lg overflow-hidden w-64"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2">
          {chat.type === 'direct' && (
            <button
              onClick={handleViewProfile}
              className="w-full text-left px-4 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md transition-colors"
            >
              <ArrowUpRight className="h-5 w-5 text-gray-500" />
              <span>View profile</span>
            </button>
          )}
          
          <button
            onClick={handlePin}
            className="w-full text-left px-4 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md transition-colors"
          >
            <Pin className="h-5 w-5 text-gray-500" />
            <span>{chat.is_pinned ? 'Unpin conversation' : 'Pin conversation'}</span>
          </button>
          
          <button
            onClick={handleMute}
            className="w-full text-left px-4 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md transition-colors"
          >
            {chat.is_muted ? (
              <>
                <Bell className="h-5 w-5 text-gray-500" />
                <span>Unmute notifications</span>
              </>
            ) : (
              <>
                <BellOff className="h-5 w-5 text-gray-500" />
                <span>Mute notifications</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleArchive}
            className="w-full text-left px-4 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md transition-colors"
          >
            <Archive className="h-5 w-5 text-gray-500" />
            <span>{chat.is_archived ? 'Unarchive chat' : 'Archive chat'}</span>
          </button>
          
          <button
            onClick={handleDelete}
            className="w-full text-left px-4 py-3 flex items-center gap-3 text-error-600 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md transition-colors"
          >
            <Trash2 className="h-5 w-5" />
            <span>Delete conversation</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ChatMenu;