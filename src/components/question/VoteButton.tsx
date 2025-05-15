import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface VoteButtonProps {
  contentId: string;
  contentType: 'question' | 'answer';
  initialCount: number;
}

const VoteButton: React.FC<VoteButtonProps> = ({
  contentId,
  contentType,
  initialCount,
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [voteCount, setVoteCount] = useState(initialCount);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);

  const handleVote = async (voteType: 1 | -1) => {
    if (!user) {
      addToast({
        type: 'error',
        message: 'Please sign in to vote',
      });
      return;
    }

    try {
      if (userVote === voteType) {
        // Remove vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .match({
            user_id: user.id,
            [contentType === 'question' ? 'question_id' : 'answer_id']: contentId,
          });

        if (error) throw error;

        setVoteCount(prev => prev - voteType);
        setUserVote(null);
      } else {
        // Add or update vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            user_id: user.id,
            [contentType === 'question' ? 'question_id' : 'answer_id']: contentId,
            vote_type: voteType,
          });

        if (error) throw error;

        setVoteCount(prev => prev + voteType - (userVote || 0));
        setUserVote(voteType);
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to vote',
      });
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => handleVote(1)}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-300 ${
          userVote === 1 ? 'text-primary-600 dark:text-primary-400' : ''
        }`}
      >
        <ChevronUp className="h-6 w-6" />
      </button>

      <motion.span
        key={voteCount}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        className="font-medium text-lg my-1"
      >
        {voteCount}
      </motion.span>

      <button
        onClick={() => handleVote(-1)}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-300 ${
          userVote === -1 ? 'text-error-600 dark:text-error-400' : ''
        }`}
      >
        <ChevronDown className="h-6 w-6" />
      </button>
    </div>
  );
};

export default VoteButton;