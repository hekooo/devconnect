import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import VoteButton from './VoteButton';

interface QuestionCardProps {
  question: {
    id: string;
    title: string;
    body: string;
    body_html?: string;
    created_at: string;
    view_count: number;
    is_solved: boolean;
    user: {
      id: string;
      username: string;
      avatar_url: string;
    };
    _count?: {
      answers: number;
      votes: number;
    };
  };
  preview?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, preview = false }) => {
  const [voteCount] = useState(question._count?.votes || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-200 rounded-xl shadow-sm overflow-hidden"
    >
      <div className="p-6">
        <div className="flex gap-6">
          {/* Vote button */}
          <div className="flex flex-col items-center">
            <VoteButton
              contentId={question.id}
              contentType="question"
              initialCount={voteCount}
            />
            {question.is_solved && (
              <div className="mt-2 px-2 py-1 bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400 text-xs font-medium rounded">
                Solved
              </div>
            )}
          </div>

          {/* Question content */}
          <div className="flex-1">
            <Link to={`/questions/${question.id}`}>
              <h2 className="text-xl font-semibold mb-2 hover:text-primary-600 dark:hover:text-primary-400">
                {question.title}
              </h2>
            </Link>

            {preview ? (
              <p className="text-gray-600 dark:text-gray-400 line-clamp-3">
                {question.body}
              </p>
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {question.body}
                </ReactMarkdown>
              </div>
            )}

            {/* Question meta */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{question._count?.answers || 0} answers</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{question.view_count} views</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <img
                  src={question.user.avatar_url}
                  alt={question.user.username}
                  className="h-6 w-6 rounded-full"
                />
                <span className="text-gray-600 dark:text-gray-400">
                  asked {formatDistanceToNow(new Date(question.created_at))} ago by{' '}
                  <Link
                    to={`/profile/${question.user.id}`}
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {question.user.username}
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default QuestionCard;