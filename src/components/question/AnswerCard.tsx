import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import VoteButton from './VoteButton';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

interface AnswerCardProps {
  answer: {
    id: string;
    body: string;
    body_html?: string;
    is_accepted: boolean;
    created_at: string;
    user: {
      id: string;
      username: string;
      avatar_url: string;
    };
    _count?: {
      votes: number;
    };
  };
  questionId: string;
  questionUserId: string;
  onAcceptAnswer?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const AnswerCard: React.FC<AnswerCardProps> = ({
  answer,
  questionId,
  questionUserId,
  onAcceptAnswer,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canEdit = user?.id === answer.user.id;
  const canDelete = user?.id === answer.user.id || user?.id === questionUserId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-dark-200 rounded-xl shadow-sm overflow-hidden ${
        answer.is_accepted ? 'border-2 border-success-500 dark:border-success-400' : ''
      }`}
    >
      <div className="p-6">
        <div className="flex gap-6">
          {/* Vote button */}
          <div className="flex flex-col items-center">
            <VoteButton
              contentId={answer.id}
              contentType="answer"
              initialCount={answer._count?.votes || 0}
            />
            {answer.is_accepted && (
              <div className="mt-2 flex items-center gap-1 text-success-600 dark:text-success-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Accepted</span>
              </div>
            )}
          </div>

          {/* Answer content */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {answer.body}
                </ReactMarkdown>
              </div>

              {(canEdit || canDelete) && (
                <div className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-full"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  <AnimatePresence>
                    {showActions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-200 rounded-md shadow-lg z-10"
                      >
                        {canEdit && (
                          <button
                            onClick={() => {
                              setShowActions(false);
                              onEdit?.();
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-300"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit Answer
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              setShowActions(false);
                              setShowDeleteConfirm(true);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error-600 hover:bg-gray-100 dark:hover:bg-dark-300"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Answer
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Answer meta */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <img
                  src={answer.user.avatar_url}
                  alt={answer.user.username}
                  className="h-6 w-6 rounded-full"
                />
                <span className="text-gray-600 dark:text-gray-400">
                  answered {formatDistanceToNow(new Date(answer.created_at))} ago by{' '}
                  <Link
                    to={`/profile/${answer.user.id}`}
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {answer.user.username}
                  </Link>
                </span>
              </div>

              {user?.id === questionUserId && !answer.is_accepted && (
                <button
                  onClick={onAcceptAnswer}
                  className="text-success-600 dark:text-success-400 hover:text-success-700 dark:hover:text-success-300 font-medium"
                >
                  Accept Answer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Delete Answer</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this answer? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete?.();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-error-600 hover:bg-error-700 rounded-md"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AnswerCard;