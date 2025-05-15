import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  X, ChevronLeft, ChevronRight, Heart, MessageSquare, 
  Share2, Bookmark, Volume2, VolumeX, MoreHorizontal, 
  Edit, Trash2, Send, ArrowLeft, ArrowRight, Flag, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';
import TimeAgo from 'timeago-react';
import { useSwipeable } from 'react-swipeable';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
    full_name?: string;
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
    full_name?: string;
  };
  _count?: {
    likes: number;
    comments: number;
  };
}

interface ReelViewerProps {
  reelId?: string;
  onClose?: () => void;
  showComments?: boolean;
  relatedReels?: Reel[];
  onNavigateReel?: (reelId: string) => void;
}

const ReelViewer: React.FC<ReelViewerProps> = ({ 
  reelId: propReelId, 
  onClose,
  showComments = false,
  relatedReels = [],
  onNavigateReel
}) => {
  const { id: paramReelId } = useParams<{ id: string }>();
  const reelId = propReelId || paramReelId;
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
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(showComments);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewTracked, setViewTracked] = useState(false);
  const [playbackStartTime, setPlaybackStartTime] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const viewThresholdRef = useRef<NodeJS.Timeout>();

  // Check if user has liked/bookmarked this reel initially
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user || !reelId) return;
      
      try {
        // Check like status
        const { data: likeData } = await supabase
          .from('reel_likes')
          .select('id')
          .eq('reel_id', reelId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsLiked(!!likeData);

        // Check bookmark status
        const { data: bookmarkData } = await supabase
          .from('saved_reels')
          .select('id')
          .eq('reel_id', reelId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsBookmarked(!!bookmarkData);
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };

    checkUserStatus();
  }, [user, reelId]);

  // Fetch reel data
  useEffect(() => {
    if (reelId) {
      fetchReel();
      fetchComments();
    }
  }, [reelId]);

  const fetchReel = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('developer_reels')
        .select(`
          *,
          user:profiles (
            id,
            username,
            avatar_url,
            full_name
          ),
          likes:reel_likes(count),
          comments:reel_comments(count)
        `)
        .eq('id', reelId)
        .single();

      if (error) throw error;
      
      setReel({
        ...data,
        _count: {
          likes: data.likes?.[0]?.count || 0,
          comments: data.comments?.[0]?.count || 0
        }
      });
      setLikeCount(data.likes?.[0]?.count || 0);
    } catch (error) {
      console.error('Error fetching reel:', error);
      addToast({
        type: 'error',
        message: 'Failed to load reel',
      });
      handleClose();
    } finally {
      setIsLoading(false);
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
            avatar_url,
            full_name
          )
        `)
        .eq('reel_id', reelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      addToast({
        type: 'error',
        message: 'Failed to load comments',
      });
    }
  };

  const trackReelView = useCallback(async () => {
    if (!reelId || !user || user.id === reel?.user.id || viewTracked) return;
    
    try {
      await supabase.rpc('increment_reel_view_count', { reel_id: reelId });
      setViewTracked(true);
      
      // Update the local view count
      if (reel) {
        setReel(prev => prev ? { ...prev, view_count: prev.view_count + 1 } : null);
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }, [reelId, user, reel, viewTracked]);

  // Video controls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setPlaybackStartTime(Date.now());
      
      // Clear any existing view threshold timer
      if (viewThresholdRef.current) {
        clearTimeout(viewThresholdRef.current);
      }
      
      // Set a timer to track the view after 3 seconds of playback
      viewThresholdRef.current = setTimeout(() => {
        if (!viewTracked && user?.id !== reel?.user.id) {
          trackReelView();
        }
      }, 3000);
    };

    const handlePause = () => {
      setIsPlaying(false);
      setPlaybackStartTime(null);
      
      // Clear view threshold timer if video is paused before 3 seconds
      if (viewThresholdRef.current) {
        clearTimeout(viewThresholdRef.current);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackStartTime(null);
    };

    const handleClick = () => setShowControls(prev => !prev);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('click', handleClick);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('click', handleClick);
      
      if (viewThresholdRef.current) {
        clearTimeout(viewThresholdRef.current);
      }
    };
  }, [reel, user, viewTracked, trackReelView]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      clearTimeout(controlsTimeoutRef.current);
    };
  }, [showControls]);

  const handleLike = async () => {
    if (!user || !reel || isProcessingLike) {
      if (!user) {
        addToast({
          type: 'info',
          message: 'Please sign in to like reels',
        });
      }
      return;
    }

    setIsProcessingLike(true);
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
          .upsert({
            reel_id: reel.id,
            user_id: user.id,
          }, {
            onConflict: 'reel_id,user_id'
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
    } finally {
      setIsProcessingLike(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      addToast({
        type: 'info',
        message: 'Please sign in to bookmark reels',
      });
      return;
    }

    try {
      if (isBookmarked) {
        await supabase
          .from('saved_reels')
          .delete()
          .eq('reel_id', reelId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('saved_reels')
          .upsert({
            reel_id: reelId,
            user_id: user.id,
          }, {
            onConflict: 'reel_id,user_id'
          });
      }

      setIsBookmarked(!isBookmarked);
      addToast({
        type: 'success',
        message: isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      addToast({
        type: 'error',
        message: 'Failed to update bookmark status',
      });
    }
  };

  const handleShare = async () => {
    if (!reel) return;
    
    const shareUrl = `${window.location.origin}/reels/${reel.id}`;
    const shareData = {
      title: reel.title,
      text: reel.description || 'Check out this developer reel!',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        addToast({
          type: 'success',
          message: 'Link copied to clipboard!',
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Sharing failed:', error);
      }
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !reel || !newComment.trim()) return;

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
            avatar_url,
            full_name
          )
        `)
        .single();

      if (error) throw error;

      setComments([data, ...comments]);
      setNewComment('');
      
      // Scroll to top of comments
      if (commentsRef.current) {
        commentsRef.current.scrollTop = 0;
      }

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

      // Delete associated files
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

      handleClose();
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

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleComments = () => {
    setShowCommentsPanel(!showCommentsPanel);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
    setShowControls(true);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/explore');
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Swipe handlers for mobile navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (onNavigateReel && relatedReels.length > 0) {
        const currentIndex = relatedReels.findIndex(r => r.id === reelId);
        if (currentIndex < relatedReels.length - 1) {
          onNavigateReel(relatedReels[currentIndex + 1].id);
        }
      }
    },
    onSwipedRight: () => {
      if (onNavigateReel && relatedReels.length > 0) {
        const currentIndex = relatedReels.findIndex(r => r.id === reelId);
        if (currentIndex > 0) {
          onNavigateReel(relatedReels[currentIndex - 1].id);
        }
      }
    },
    trackMouse: true
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!reel) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      {...swipeHandlers}
    >
      {/* Main container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative w-full h-full md:w-[90%] md:h-[90%] md:max-w-6xl md:max-h-[80vh] md:rounded-2xl overflow-hidden flex bg-black"
      >
        {/* Video side */}
        <div 
          className="relative flex-1 flex items-center justify-center bg-black"
          onClick={() => setShowControls(prev => !prev)}
        >
          {/* Video element */}
          <video
            ref={videoRef}
            src={reel.video_url}
            poster={reel.thumbnail_url || undefined}
            className="w-full h-full object-contain"
            loop
            muted={isMuted}
            playsInline
            autoPlay
          />
          
          {/* Play/Pause overlay */}
          <AnimatePresence>
            {showControls && !isPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="bg-white/20 backdrop-blur-sm rounded-full p-4"
                >
                  <ChevronRight className="h-12 w-12 text-white" fill="white" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Progress bar */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800/50 cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-primary-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Top controls */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10"
              >
                <button
                  onClick={handleClose}
                  className="p-2 bg-black/30 rounded-full backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="p-2 bg-black/30 rounded-full backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="h-6 w-6" />
                    ) : (
                      <Volume2 className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Navigation arrows for related reels */}
          {onNavigateReel && relatedReels.length > 0 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = relatedReels.findIndex(r => r.id === reelId);
                  if (currentIndex > 0) {
                    onNavigateReel(relatedReels[currentIndex - 1].id);
                  }
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 rounded-full backdrop-blur-sm text-white hover:bg-black/50 transition-colors z-10"
                disabled={relatedReels.findIndex(r => r.id === reelId) === 0}
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = relatedReels.findIndex(r => r.id === reelId);
                  if (currentIndex < relatedReels.length - 1) {
                    onNavigateReel(relatedReels[currentIndex + 1].id);
                  }
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 rounded-full backdrop-blur-sm text-white hover:bg-black/50 transition-colors z-10"
                disabled={relatedReels.findIndex(r => r.id === reelId) === relatedReels.length - 1}
              >
                <ArrowRight className="h-6 w-6" />
              </button>
            </>
          )}
          
          {/* Bottom info */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-10"
              >
                <div className="flex items-start justify-between">
                  <div className="max-w-[70%]">
                    <h2 className="text-white text-xl font-bold mb-2 line-clamp-2">
                      {reel.title}
                    </h2>
                    {reel.description && (
                      <p className="text-white/80 text-sm mb-2 line-clamp-2">
                        {reel.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/profile/${reel.user.id}`}
                        className="flex items-center gap-2 group"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img
                          src={reel.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${reel.user.username}`}
                          alt={reel.user.username}
                          className="w-8 h-8 rounded-full border border-white/30"
                        />
                        <div>
                          <p className="text-white font-medium">
                            {reel.user.full_name || `@${reel.user.username}`}
                          </p>
                          <p className="text-white/60 text-xs">
                            <TimeAgo datetime={reel.created_at} />
                          </p>
                        </div>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Right side actions */}
                  <div className="flex flex-col gap-4 items-center">
                    <div className="flex flex-col items-center">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike();
                        }}
                        disabled={isProcessingLike}
                        className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
                      >
                        <Heart
                          className={`h-6 w-6 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
                        />
                      </motion.button>
                      <span className="text-white text-xs mt-1 font-medium">
                        {formatCount(likeCount)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComments();
                        }}
                        className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
                      >
                        <MessageSquare className="h-6 w-6 text-white" />
                      </motion.button>
                      <span className="text-white text-xs mt-1 font-medium">
                        {formatCount(comments.length)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookmark();
                        }}
                        className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
                      >
                        <Bookmark
                          className={`h-6 w-6 ${isBookmarked ? 'text-primary-500 fill-primary-500' : 'text-white'}`}
                        />
                      </motion.button>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare();
                        }}
                        className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
                      >
                        <Share2 className="h-6 w-6 text-white" />
                      </motion.button>
                    </div>
                    
                    <div className="relative">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActionsMenu(!showActionsMenu);
                        }}
                        className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
                      >
                        <MoreHorizontal className="h-6 w-6 text-white" />
                      </motion.button>
                      
                      <AnimatePresence>
                        {showActionsMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 bottom-full mb-2 bg-white dark:bg-dark-200 rounded-xl shadow-xl overflow-hidden w-48 z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {user?.id === reel.user.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    setShowActionsMenu(false);
                                    navigate(`/reels/edit/${reel.id}`);
                                  }}
                                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-300 flex items-center gap-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit Reel
                                </button>
                                <button
                                  onClick={() => {
                                    setShowActionsMenu(false);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-300 text-red-500 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setShowActionsMenu(false);
                                    navigate(`/report?content=reel&id=${reel.id}`);
                                  }}
                                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-300 flex items-center gap-2"
                                >
                                  <Flag className="h-4 w-4" />
                                  Report
                                </button>
                                <button
                                  onClick={() => {
                                    setShowActionsMenu(false);
                                    // Implement watch later functionality
                                  }}
                                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-300 flex items-center gap-2"
                                >
                                  <Clock className="h-4 w-4" />
                                  Watch Later
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                
                {/* Tags */}
                {reel.tags && reel.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {reel.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/explore?search=${tag}`}
                        className="px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white hover:bg-white/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Comments panel */}
        <AnimatePresence>
          {showCommentsPanel && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute md:relative inset-0 md:inset-auto md:w-96 bg-white dark:bg-dark-200 flex flex-col h-full border-l border-gray-200 dark:border-dark-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Comments header */}
              <div className="p-4 border-b border-gray-200 dark:border-dark-300 flex items-center justify-between">
                <h3 className="font-semibold text-lg">Comments ({comments.length})</h3>
                <button
                  onClick={toggleComments}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Comments list */}
              <div 
                ref={commentsRef} 
                className="flex-1 overflow-y-auto p-4 space-y-6"
              >
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 text-gray-500 dark:text-gray-400">
                    <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium mb-1">No comments yet</p>
                    <p className="text-sm">Be the first to comment!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Link
                        to={`/profile/${comment.user.id}`}
                        className="flex-shrink-0"
                      >
                        <img
                          src={comment.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${comment.user.username}`}
                          alt={comment.user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/profile/${comment.user.id}`}
                            className="font-medium hover:underline"
                          >
                            {comment.user.full_name || comment.user.username}
                          </Link>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            <TimeAgo datetime={comment.created_at} />
                          </span>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 mt-1">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Comment form */}
              {user ? (
                <form 
                  onSubmit={handleSubmitComment}
                  className="p-4 border-t border-gray-200 dark:border-dark-300"
                >
                  <div className="flex gap-3 items-center">
                    <img
                      src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${user.email}`}
                      alt={user.user_metadata?.username || user.email}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full pr-12"
                        disabled={isSubmittingComment}
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !newComment.trim()}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full ${
                          newComment.trim()
                            ? 'text-primary-600 hover:text-primary-700'
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-4 border-t border-gray-200 dark:border-dark-300 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Sign in to leave a comment
                  </p>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-dark-200 rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-3">Delete Reel</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this reel? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReelViewer;