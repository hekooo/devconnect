import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, Share2, Eye, Volume2, VolumeX, MoreHorizontal, Bookmark, Send, Clock, UserPlus, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';
import TimeAgo from 'timeago-react';

interface ReelCardProps {
  reel: {
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
    _count: {
      likes: number;
      comments: number;
    };
  };
  onView?: (reelId: string) => void;
  isActive?: boolean;
  autoplay?: boolean;
  onLikeToggle?: (reelId: string, liked: boolean) => void;
  onFollowToggle?: (userId: string) => void;
  isFollowing?: boolean;
}

const ReelCard = ({ 
  reel, 
  onView, 
  isActive = false, 
  autoplay = false, 
  onLikeToggle,
  onFollowToggle,
  isFollowing = false
}: ReelCardProps) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  const [playbackStartTime, setPlaybackStartTime] = useState<number | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const viewThresholdRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (user) {
      checkLikeStatus();
      checkSaveStatus();
    }
  }, [user, reel.id]);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const handlePlay = () => {
      setIsPlaying(true);
      setPlaybackStartTime(Date.now());
      
      // Clear any existing view threshold timer
      if (viewThresholdRef.current) {
        clearTimeout(viewThresholdRef.current);
      }
      
      // Set a timer to track the view after 3 seconds of playback
      viewThresholdRef.current = setTimeout(() => {
        if (!viewTracked && user?.id !== reel.user.id) {
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

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackStartTime(null);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    if (autoplay && isActive) {
      video.currentTime = 0;
      const playPromise = video.play();

      playPromise.catch(error => {
        console.log('Auto-play prevented:', error);
        if (error.name === 'NotAllowedError') {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(e => console.log('Muted play failed:', e));
        }
      });
    } else {
      video.pause();
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      
      if (viewThresholdRef.current) {
        clearTimeout(viewThresholdRef.current);
      }
    };
  }, [autoplay, isActive, reel.id, user, viewTracked]);

  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const checkLikeStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('reel_likes')
        .select('id')
        .eq('reel_id', reel.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking like status:', error);
        return;
      }

      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const checkSaveStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_reels')
        .select('id')
        .eq('reel_id', reel.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking save status:', error);
        return;
      }

      setIsSaved(!!data);
    } catch (error) {
      console.error('Error checking save status:', error);
    }
  };

  const trackReelView = async () => {
    if (!user || user.id === reel.user.id || viewTracked) return;
    
    try {
      await supabase.rpc('increment_reel_view_count', { reel_id: reel.id });
      setViewTracked(true);
      
      if (onView) {
        onView(reel.id);
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const toggleLike = useCallback(async () => {
    if (!user) {
      addToast({ type: 'info', message: 'Please login to like reels' });
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('reel_likes')
          .delete()
          .eq('reel_id', reel.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('reel_likes')
          .insert({ reel_id: reel.id, user_id: user.id });
      }

      setIsLiked(!isLiked);
      if (onLikeToggle) {
        onLikeToggle(reel.id, !isLiked);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      addToast({ type: 'error', message: 'Failed to update like status' });
    }
  }, [user, isLiked, reel.id, addToast, onLikeToggle]);

  const toggleSave = useCallback(async () => {
    if (!user) {
      addToast({ type: 'info', message: 'Please login to save reels' });
      return;
    }

    try {
      if (isSaved) {
        await supabase
          .from('saved_reels')
          .delete()
          .eq('reel_id', reel.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('saved_reels')
          .insert({ reel_id: reel.id, user_id: user.id });
      }

      setIsSaved(!isSaved);
      addToast({
        type: 'success',
        message: isSaved ? 'Removed from saved' : 'Added to saved'
      });
    } catch (error) {
      console.error('Error toggling save:', error);
      addToast({ type: 'error', message: 'Failed to update save status' });
    }
  }, [user, isSaved, reel.id, addToast]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleVideoClick = () => {
    setShowControls(!showControls);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const shareReel = async () => {
    const shareUrl = `${window.location.origin}/reels/${reel.id}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: reel.title,
          text: reel.description || 'Check out this reel!',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        addToast({ type: 'success', message: 'Link copied to clipboard!' });
      }
    } catch (err) {
      console.error('Sharing failed:', err);
    }
  };

  const handleFollow = () => {
    if (onFollowToggle) {
      onFollowToggle(reel.user.id);
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

  // Check if the reel belongs to the current user
  const isOwnReel = user?.id === reel.user.id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full h-full flex flex-col bg-black select-none"
    >
      <div 
        className="relative flex-1 flex items-center justify-center overflow-hidden"
        onClick={handleVideoClick}
      >
        <video
          ref={videoRef}
          src={reel.video_url}
          poster={reel.thumbnail_url || undefined}
          className="h-full w-full object-contain"
          loop
          muted={isMuted}
          playsInline
        />

        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 flex items-center justify-center"
            >
              <button
                onClick={togglePlayPause}
                className="p-4 bg-black/50 rounded-full text-white backdrop-blur-sm"
              >
                {isPlaying ? (
                  <div className="h-12 w-12 flex items-center justify-center">
                    <div className="h-12 w-1 bg-white mx-1" />
                    <div className="h-12 w-1 bg-white mx-1" />
                  </div>
                ) : (
                  <div className="h-12 w-12 border-l-[16px] border-r-0 border-y-[12px] border-y-transparent border-l-white ml-2" />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600/50 cursor-pointer"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-primary-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="absolute bottom-20 left-4 z-10">
        <div className="flex flex-col items-start gap-5">
          <Link
            to={`/profile/${reel.user.id}`}
            className="flex items-center gap-2 group"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={reel.user.avatar_url || '/default-avatar.png'}
                alt={reel.user.username}
                className="h-10 w-10 rounded-full object-cover border-2 border-white"
              />
              {isActive && (
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border border-white" />
              )}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white font-medium">{reel.user.full_name || reel.user.username}</p>
              <p className="text-white/80 text-xs">@{reel.user.username}</p>
            </div>
          </Link>

          <div className="max-w-xs">
            <p className="text-white font-medium text-sm line-clamp-3">
              {reel.title}
              {reel.description && (
                <>
                  <br />
                  <span className="text-white/80">{reel.description}</span>
                </>
              )}
            </p>
          </div>

          {reel.tags && reel.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {reel.tags.slice(0, 3).map(tag => (
                <Link
                  key={tag}
                  to={`/explore?search=${tag}`}
                  className="text-xs bg-white/10 text-white px-2.5 py-1 rounded-full hover:bg-white/20 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute right-4 bottom-20 z-10">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center">
            <motion.button
              whileTap={{ scale: 1.2 }}
              onClick={toggleLike}
              className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
            >
              <Heart
                className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`}
              />
            </motion.button>
            <span className="text-xs text-white mt-1 font-medium">
              {formatCount(reel._count.likes + (isLiked ? 1 : 0))}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <Link
              to={`/reels/${reel.id}`}
              className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
              onClick={e => e.stopPropagation()}
            >
              <MessageSquare className="h-6 w-6 text-white" />
            </Link>
            <span className="text-xs text-white mt-1 font-medium">
              {formatCount(reel._count.comments)}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <motion.button
              whileTap={{ scale: 1.1 }}
              onClick={shareReel}
              className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
            >
              <Share2 className="h-6 w-6 text-white" />
            </motion.button>
            <span className="text-xs text-white mt-1 font-medium">Share</span>
          </div>

          <div className="flex flex-col items-center">
            <motion.button
              whileTap={{ scale: 1.1 }}
              onClick={toggleSave}
              className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
            >
              <Bookmark
                className={`h-6 w-6 ${isSaved ? 'fill-primary-500 text-primary-500' : 'text-white'}`}
              />
            </motion.button>
            <span className="text-xs text-white mt-1 font-medium">Save</span>
          </div>

          {/* Follow button - only show if not the user's own reel */}
          {!isOwnReel && (
            <div className="flex flex-col items-center">
              <motion.button
                whileTap={{ scale: 1.1 }}
                onClick={handleFollow}
                className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
              >
                {isFollowing ? (
                  <UserCheck className="h-6 w-6 text-primary-500" />
                ) : (
                  <UserPlus className="h-6 w-6 text-white" />
                )}
              </motion.button>
              <span className="text-xs text-white mt-1 font-medium">
                {isFollowing ? 'Following' : 'Follow'}
              </span>
            </div>
          )}

          <div className="relative flex flex-col items-center">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
            >
              <MoreHorizontal className="h-6 w-6 text-white" />
            </button>

            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-2 right-0 w-48 bg-dark-200 rounded-lg shadow-lg overflow-hidden z-20"
                  onClick={e => e.stopPropagation()}
                >
                  <button className="w-full px-4 py-3 text-left text-white hover:bg-dark-300 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    <span>Send to friend</span>
                  </button>
                  <button className="w-full px-4 py-3 text-left text-white hover:bg-dark-300 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Watch later</span>
                  </button>
                  <button 
                    className="w-full px-4 py-3 text-left text-red-500 hover:bg-dark-300"
                    onClick={() => navigate(`/report?content=reel&id=${reel.id}`)}
                  >
                    Report
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 1.1 }}
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
          >
            {isMuted ? (
              <VolumeX className="h-6 w-6 text-white" />
            ) : (
              <Volume2 className="h-6 w-6 text-white" />
            )}
          </motion.button>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 px-4 z-10">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/80 bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
            <TimeAgo datetime={reel.created_at} />
          </div>

          <div className="flex items-center gap-1 text-xs text-white/80 bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
            <Eye className="h-3 w-3" />
            <span>{formatCount(reel.view_count)} views</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReelCard;