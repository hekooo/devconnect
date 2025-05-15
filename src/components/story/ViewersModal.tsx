import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface Viewer {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
    full_name?: string;
  };
  created_at: string;
}

interface ViewersModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewers: Viewer[];
}

const ViewersModal: React.FC<ViewersModalProps> = ({ isOpen, onClose, viewers }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="bg-white dark:bg-dark-200 rounded-t-xl md:rounded-xl w-full md:w-96 max-h-[70vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-dark-300 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Viewers</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
          {viewers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No one has viewed this story yet
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-dark-300">
              {viewers.map((viewer) => (
                <Link
                  key={viewer.id}
                  to={`/profile/${viewer.user.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors"
                  onClick={onClose}
                >
                  <img
                    src={viewer.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${viewer.user.username}`}
                    alt={viewer.user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {viewer.user.full_name || viewer.user.username}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      @{viewer.user.username}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDistanceToNow(new Date(viewer.created_at), { addSuffix: true })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ViewersModal;