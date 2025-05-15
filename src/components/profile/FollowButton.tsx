import { useState, useEffect } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface FollowButtonProps {
  userId: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({ userId, onFollowChange }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkFollowStatus();
    }
  }, [user, userId]);

  const checkFollowStatus = async () => {
    try {
      const { data } = await supabase
        .from('follows')
        .select()
        .match({ follower_id: user?.id, following_id: userId })
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      addToast({
        type: 'error',
        message: 'Please sign in to follow users',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .match({ follower_id: user.id, following_id: userId });

        if (error) throw error;

        setIsFollowing(false);
        if (onFollowChange) onFollowChange(false);
        
        addToast({
          type: 'success',
          message: 'Unfollowed successfully',
        });
      } else {
        const { error: followError } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId,
          });

        if (followError) throw followError;

        setIsFollowing(true);
        if (onFollowChange) onFollowChange(true);
        
        addToast({
          type: 'success',
          message: 'Following successfully',
        });
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      addToast({
        type: 'error',
        message: error.message || 'Failed to update follow status',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <button className="btn-primary opacity-50 cursor-not-allowed">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      </button>
    );
  }

  return (
    <motion.button
      onClick={handleFollow}
      whileTap={{ scale: 0.95 }}
      className={`btn ${
        isFollowing
          ? 'btn-outline text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20'
          : 'btn-primary'
      }`}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Follow
        </>
      )}
    </motion.button>
  );
};

export default FollowButton;