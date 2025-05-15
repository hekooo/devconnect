import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Bookmark, Share2, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    content_html?: string;
    post_type: 'text' | 'image' | 'code' | 'blog';
    code_language?: string;
    title?: string;
    images?: string[];
    created_at: string;
    user?: {
      username: string;
      full_name: string;
      avatar_url: string;
    };
    _count?: {
      likes: number;
      comments: number;
      bookmarks: number;
    };
  };
  onDelete?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onDelete }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);

  const checkLikeStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const checkBookmarkStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      setIsBookmarked(!!data);
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  };

  // Use useEffect instead of useState for initialization
  useEffect(() => {
    if (user) {
      checkLikeStatus();
      checkBookmarkStatus();
    }
  }, [user, post.id]);

  const handleLike = async () => {
    if (!user || !post || isProcessingLike) {
      if (!user) {
        addToast({
          type: 'error',
          message: 'Please sign in to like posts',
        });
      }
      return;
    }

    setIsProcessingLike(true);
    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-like`;
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: post.id,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to toggle like');
      }

      const data = await response.json();
      setIsLiked(data.action === 'liked');
      setLikeCount(data.likeCount);
    } catch (error) {
      console.error('Error toggling like:', error);
      addToast({
        type: 'error',
        message: error.message || 'Failed to update like status',
      });
    } finally {
      setIsProcessingLike(false);
    }
  };

  const handleBookmark = async () => {
    if (!user || !post) {
      addToast({
        type: 'error',
        message: 'Please sign in to bookmark posts',
      });
      return;
    }

    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .match({ post_id: post.id, user_id: user.id });

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setIsBookmarked(false);
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ post_id: post.id, user_id: user.id })
          .select()
          .single();

        if (error) throw error;

        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Error updating bookmark:', error);
      addToast({
        type: 'error',
        message: 'Failed to update bookmark status',
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: post.title || 'DevConnect Post',
        text: post.content,
        url: `${window.location.origin}/posts/${post.id}`,
      });
    } catch (error) {
      // Fall back to copying to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
      addToast({
        type: 'success',
        message: 'Link copied to clipboard!',
      });
    }
  };

  const handleDelete = async () => {
    if (!user || !post || user.id !== post.user_id) return;

    setIsDeleting(true);
    try {
      // Delete any associated images from storage
      if (post.images && post.images.length > 0) {
        const imagePaths = post.images.map(url => {
          const path = url.split('/').pop();
          return `${user.id}/${path}`;
        });

        await supabase.storage
          .from('posts')
          .remove(imagePaths);
      }

      // Delete the post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      addToast({
        type: 'success',
        message: 'Post deleted successfully',
      });

      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to delete post',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-200 rounded-xl shadow-sm overflow-hidden"
    >
      {/* Post header */}
      <div className="p-4 flex items-center justify-between">
        <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3">
          <img
            src={post.user?.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${post.user?.username || post.user_id}`}
            alt={post.user?.full_name || 'User'}
            className="h-10 w-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-medium">{post.user?.full_name || 'Unknown User'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </Link>

        {user?.id === post.user_id && (
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
                  <Link
                    to={`/posts/edit/${post.id}`}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-300"
                  >
                    <Edit className="h-4 w-4" />
                    Edit post
                  </Link>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error-600 hover:bg-gray-100 dark:hover:bg-dark-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete post
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Post content */}
      <div className="px-4">
        {post.title && (
          <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
        )}

        {post.post_type === 'text' && (
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        )}

        {post.post_type === 'code' && (
          <div className="mb-4">
            <SyntaxHighlighter
              language={post.code_language || 'javascript'}
              style={atomDark}
              className="rounded-md !bg-gray-900"
            >
              {post.content}
            </SyntaxHighlighter>
          </div>
        )}

        {post.post_type === 'image' && post.images && post.images.length > 0 && (
          <div className="mb-4">
            {post.content && (
              <p className="mb-2">{post.content}</p>
            )}
            <div className={`grid gap-2 ${
              post.images.length === 1 ? 'grid-cols-1' :
              post.images.length === 2 ? 'grid-cols-2' :
              'grid-cols-2 md:grid-cols-3'
            }`}>
              {post.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Post image ${index + 1}`}
                  className="rounded-md w-full h-48 object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Post stats */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-300 flex justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex gap-4">
          <span>{likeCount} likes</span>
          <span>{post._count?.comments || 0} comments</span>
        </div>
        <span>{post._count?.bookmarks || 0} bookmarks</span>
      </div>

      {/* Post actions */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-300 flex justify-between">
        <button
          onClick={handleLike}
          disabled={isProcessingLike}
          className={`flex items-center gap-1 text-sm transition-colors ${
            isLiked
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
          } ${isProcessingLike ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isProcessingLike ? (
            <div className="h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-1"></div>
          ) : (
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          )}
          <span>Like</span>
        </button>
        
        <Link
          to={`/posts/${post.id}`}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Comment</span>
        </Link>

        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1 text-sm transition-colors ${
            isBookmarked
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          <span>Bookmark</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Delete Post</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-error-600 hover:bg-error-700 rounded-md disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PostCard;