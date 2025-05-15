import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowLeft, Heart, MessageSquare, Share2, Bookmark, 
  Tag, User, Send, MoreHorizontal, Edit, Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

interface Reel {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  view_count: number;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

const ReelDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [reel, setReel] = useState<Reel | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [relatedReels, setRelatedReels] = useState<Reel[]>([]);
  
  useEffect(() => {
    if (id) {
      fetchReel();
      fetchComments();
      checkLikeStatus();
      trackView();
    }
  }, [id]);

  const fetchReel = async () => {
    try {
      const { data, error } = await supabase
        .from('developer_reels')
        .select(`
          *,
          user:profiles (
            id,
            username,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setReel(data);
      
      // Fetch related reels based on tags
      if (data.tags && data.tags.length > 0) {
        fetchRelatedReels(data.tags, data.id);
      }
    } catch (error) {
      console.error('Error fetching reel:', error);
      addToast({
        type: 'error',
        message: 'Failed to load reel',
      });
      navigate('/explore');
    }
  };

  const fetchRelatedReels = async (tags: string[], currentReelId: string) => {
    try {
      const { data, error } = await supabase
        .from('developer_reels')
        .select(`
          id,
          title,
          thumbnail_url,
          video_url,
          created_at,
          user:profiles (
            id,
            username,
            avatar_url
          )
        `)
        .neq('id', currentReelId)
        .overlaps('tags', tags)
        .limit(4);

      if (error) throw error;
      setRelatedReels(data || []);
    } catch (error) {
      console.error('Error fetching related reels:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('reel_comments')
        .select(`
          id,
          content,
          created_at,
          user:profiles (
            id,
            username,
            avatar_url
          )
        `)
        .eq('reel_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
      setCommentCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const checkLikeStatus = async () => {
    if (!user) return;
    
    try {
      // Check if user has liked this reel
      const { data: likeData, error: likeError } = await supabase
        .from('reel_likes')
        .select()
        .eq('reel_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (likeError) {
        console.error('Error checking like status:', likeError);
        return;
      }

      setIsLiked(!!likeData);
      
      // Get total like count
      const { count, error: countError } = await supabase
        .from('reel_likes')
        .select('*', { count: 'exact', head: true })
        .eq('reel_id', id);
      
      if (countError) {
        console.error('Error getting like count:', countError);
        return;
      }

      setLikeCount(count || 0);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const trackView = async () => {
    if (!id) return;

    try {
      await supabase.rpc('increment_reel_view_count', { reel_id: id });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !reel) {
      addToast({
        type: 'error',
        message: 'Please sign in to like reels',
      });
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('reel_likes')
          .delete()
          .eq('reel_id', reel.id)
          .eq('user_id', user.id);

        if (error) throw error;
        
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        // Like
        const { error } = await supabase
          .from('reel_likes')
          .insert({
            reel_id: reel.id,
            user_id: user.id,
          });

        if (error) throw error;
        
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      addToast({
        type: 'error',
        message: 'Failed to update like status',
      });
    }
  };

  const handleBookmark = () => {
    if (!user) {
      addToast({
        type: 'error',
        message: 'Please sign in to bookmark reels',
      });
      return;
    }

    setIsBookmarked(!isBookmarked);
    addToast({
      type: 'success',
      message: isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
    });
  };

  const handleShare = async () => {
    if (!reel) return;
    
    try {
      await navigator.share({
        title: reel.title,
        text: reel.description || 'Check out this developer reel!',
        url: `${window.location.origin}/reels/${reel.id}`,
      });
    } catch (error) {
      // Fall back to copying to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/reels/${reel.id}`);
      addToast({
        type: 'success',
        message: 'Link copied to clipboard!',
      });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !reel || !new Comment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('reel_comments')
        .insert({
          reel_id: reel.id,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select(`
          id,
          content,
          created_at,
          user:profiles (
            id,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      setComments([data, ...comments]);
      setCommentCount(prev => prev + 1);
      setNewComment('');
      
      addToast({
        type: 'success',
        message: 'Comment added successfully',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to add comment',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !reel || user.id !== reel.user.id) return;

    setIsDeleting(true);
    try {
      // Delete reel record
      const { error: deleteError } = await supabase
        .from('developer_reels')
        .delete()
        .eq('id', reel.id);

      if (deleteError) throw deleteError;

      // Extract file paths from URLs
      const videoPath = reel.video_url.split('/').pop();
      if (videoPath) {
        await supabase.storage
          .from('reels')
          .remove([`${user.id}/${videoPath}`]);
      }

      if (reel.thumbnail_url) {
        const thumbnailPath = reel.thumbnail_url.split('/').pop();
        if (thumbnailPath) {
          await supabase.storage
            .from('reel-thumbnails')
            .remove([`${user.id}/${thumbnailPath}`]);
        }
      }

      addToast({
        type: 'success',
        message: 'Reel deleted successfully',
      });

      navigate('/explore');
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to delete reel',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const toggleMute = () => {
    const video = document.getElementById('reel-video') as HTMLVideoElement;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!reel) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link
        to="/explore"
        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Explore
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video section */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden aspect-[9/16] md:aspect-video relative">
            <video
              id="reel-video"
              src={reel.video_url}
              poster={reel.thumbnail_url || undefined}
              className="w-full h-full object-contain"
              controls
              autoPlay
              playsInline
              muted={isMuted}
            />
            
            {/* Video controls overlay */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={toggleMute}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              >
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-x"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                )}
              </button>
            </div>
          </div>

          {/* Reel info */}
          <div className="mt-6">
            <div className="flex items-start justify-between">
              <h1 className="text-2xl font-bold">{reel.title}</h1>
              
              {user?.id === reel.user.id && (
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
                          to={`/reels/edit/${reel.id}`}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-300"
                        >
                          <Edit className="h-4 w-4" />
                          Edit reel
                        </Link>
                        <button
                          onClick={() => {
                            setShowActions(false);
                            setShowDeleteConfirm(true);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error-600 hover:bg-gray-100 dark:hover:bg-dark-300"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete reel
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Heart
                    className={`h-6 w-6 cursor-pointer ${
                      isLiked ? 'text-red-500 fill-red-500' : 'hover:text-red-500'
                    }`}
                    onClick={handleLike}
                  />
                  <span>{likeCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-6 w-6" />
                  <span>{commentCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bookmark
                    className={`h-6 w-6 cursor-pointer ${
                      isBookmarked ? 'text-yellow-500 fill-yellow-500' : 'hover:text-yellow-500'
                    }`}
                    onClick={handleBookmark}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Share2
                    className="h-6 w-6 cursor-pointer hover:text-primary-500"
                    onClick={handleShare}
                  />
                </div>
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {reel.view_count} views
              </div>
            </div>
            
            <div className="mt-6 flex items-start gap-4">
              <Link to={`/profile/${reel.user.id}`}>
                <img
                  src={reel.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${reel.user.username}`}
                  alt={reel.user.username}
                  className="w-12 h-12 rounded-full"
                />
              </Link>
              <div>
                <Link
                  to={`/profile/${reel.user.id}`}
                  className="font-medium hover:text-primary-600 dark:hover:text-primary-400"
                >
                  @{reel.user.username}
                </Link>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Posted {formatDistanceToNow(new Date(reel.created_at), { addSuffix: true })}
                </p>
                {reel.description && (
                  <p className="mt-4 text-gray-700 dark:text-gray-300">{reel.description}</p>
                )}
              </div>
            </div>
            
            {/* Tags */}
            {reel.tags && reel.tags.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {reel.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 dark:bg-dark-300 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Comments section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-dark-300">
              <h2 className="font-semibold">Comments ({commentCount})</h2>
            </div>
            
            {user ? (
              <form onSubmit={handleSubmitComment} className="p-4 border-b border-gray-200 dark:border-dark-300">
                <div className="flex gap-3">
                  <img
                    src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${user.email}`}
                    alt="Your avatar"
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1 flex">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-gray-100 dark:bg-dark-300 border-0"
                      disabled={isSubmittingComment}
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newComment.trim()}
                      className={`ml-2 p-2 rounded-full ${
                        newComment.trim()
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-gray-200 dark:bg-dark-300 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-4 border-b border-gray-200 dark:border-dark-300 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Sign in to comment
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
                >
                  Sign In
                </button>
              </div>
            )}
            
            <div className="max-h-[500px] overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No comments yet</p>
                  <p className="text-sm">Be the first to comment!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-dark-300">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-4">
                      <div className="flex gap-3">
                        <Link to={`/profile/${comment.user.id}`}>
                          <img
                            src={comment.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${comment.user.username}`}
                            alt={comment.user.username}
                            className="w-8 h-8 rounded-full"
                          />
                        </Link>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/profile/${comment.user.id}`}
                              className="font-medium hover:text-primary-600 dark:hover:text-primary-400"
                            >
                              {comment.user.username}
                            </Link>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mt-1">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Related reels */}
          {relatedReels.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Related Reels</h3>
              <div className="grid grid-cols-2 gap-4">
                {relatedReels.map((relatedReel) => (
                  <Link
                    key={relatedReel.id}
                    to={`/reels/${relatedReel.id}`}
                    className="block group"
                  >
                    <div className="aspect-[9/16] bg-gray-100 dark:bg-dark-300 rounded-lg overflow-hidden relative">
                      {relatedReel.thumbnail_url ? (
                        <img
                          src={relatedReel.thumbnail_url}
                          alt={relatedReel.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={relatedReel.video_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play text-white h-12 w-12"><polygon points="5 3 19 12 5 21 5 3" fill="white"/></svg>
                      </div>
                    </div>
                    <h4 className="mt-2 font-medium line-clamp-1">{relatedReel.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{relatedReel.user.username}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
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
              <h3 className="text-lg font-semibold mb-2">Delete Reel</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this reel? This action cannot be undone.
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
    </div>
  );
};

export default ReelDetailPage;