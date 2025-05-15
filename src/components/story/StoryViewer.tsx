import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, MoreHorizontal, Edit, Trash2, Heart, MessageSquare, Send, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import ViewersModal from './ViewersModal';
import supabase from '../../lib/supabase';

interface Story {
  id: string;
  media_url: string;
  caption: string | null;
  caption_position: { x: number; y: number } | null;
  created_at: string;
  expires_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
    full_name?: string;
  };
}

interface StoryView {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
    full_name?: string;
  };
  created_at: string;
}

const STORY_DURATION = 5000; // 5 seconds per story

const StoryViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [story, setStory] = useState<Story | null>(null);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [captionPosition, setCaptionPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingCaption, setIsDraggingCaption] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryView[]>([]);
  const [viewCount, setViewCount] = useState(0);
  
  const progressTimer = useRef<NodeJS.Timeout>();
  const storyTimer = useRef<NodeJS.Timeout>();
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchStories();
      trackView();
      checkLikeStatus();
      fetchViewers();
    }
    
    return () => {
      clearTimeout(progressTimer.current);
      clearTimeout(storyTimer.current);
    };
  }, [id]);

  // Handle progress bar animation
  useEffect(() => {
    if (!story || isPaused) return;
    
    const startTime = Date.now();
    const animateProgress = () => {
      const elapsedTime = Date.now() - startTime;
      const newProgress = Math.min((elapsedTime / STORY_DURATION) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress < 100) {
        progressTimer.current = setTimeout(animateProgress, 16); // ~60fps
      } else {
        // Move to next story when progress reaches 100%
        handleNext();
      }
    };
    
    progressTimer.current = setTimeout(animateProgress, 16);
    
    return () => {
      clearTimeout(progressTimer.current);
    };
  }, [story, isPaused, currentStoryIndex]);

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStories = async () => {
    try {
      const { data: currentStory, error: storyError } = await supabase
        .from('stories')
        .select(`
          *,
          user:profiles (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .eq('id', id)
        .single();

      if (storyError) throw storyError;

      setStory(currentStory);
      setEditedCaption(currentStory.caption || '');
      setCaptionPosition(currentStory.caption_position);

      const { data: userStories, error: userStoriesError } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', currentStory.user.id)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (userStoriesError) throw userStoriesError;

      setUserStories(userStories || []);
      setCurrentStoryIndex(userStories?.findIndex(s => s.id === id) || 0);
    } catch (error) {
      console.error('Error fetching stories:', error);
      navigate('/');
    }
  };

  const trackView = async () => {
    if (!user || !id) return;

    try {
      const { data: existingView, error: checkError } = await supabase
        .from('story_views')
        .select('id')
        .eq('story_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing view:', checkError);
        return;
      }

      if (!existingView) {
        const { error: insertError } = await supabase
          .from('story_views')
          .insert({
            story_id: id,
            user_id: user.id,
          });

        if (insertError) {
          console.error('Error tracking view:', insertError);
        }
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const checkLikeStatus = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('story_likes')
        .select('id')
        .eq('story_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      setIsLiked(!!data);
      
      // Get like count
      const { count, error: countError } = await supabase
        .from('story_likes')
        .select('id', { count: 'exact', head: true })
        .eq('story_id', id);
      
      if (countError) throw countError;
      
      setLikeCount(count || 0);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const fetchViewers = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('story_views')
        .select(`
          id,
          created_at,
          user:profiles (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .eq('story_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setViewers(data || []);
      setViewCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching viewers:', error);
    }
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentStoryIndex > 0) {
      navigate(`/stories/${userStories[currentStoryIndex - 1].id}`);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentStoryIndex < userStories.length - 1) {
      navigate(`/stories/${userStories[currentStoryIndex + 1].id}`);
    } else {
      navigate('/');
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  const handleDelete = async () => {
    if (!user || !story || user.id !== story.user.id) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('stories')
        .delete()
        .eq('id', story.id);

      if (deleteError) throw deleteError;

      const mediaPath = story.media_url.split('/').pop();
      if (mediaPath) {
        await supabase.storage
          .from('stories')
          .remove([`${user.id}/${mediaPath}`]);
      }

      addToast({
        type: 'success',
        message: 'Story deleted successfully',
      });

      navigate('/');
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to delete story',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!user || !story || user.id !== story.user.id) return;

    try {
      const { error } = await supabase
        .from('stories')
        .update({ 
          caption: editedCaption,
          caption_position: captionPosition
        })
        .eq('id', story.id);

      if (error) throw error;

      setStory(prev => prev ? { 
        ...prev, 
        caption: editedCaption,
        caption_position: captionPosition
      } : null);
      setIsEditing(false);
      setIsPaused(false);
      
      addToast({
        type: 'success',
        message: 'Story updated successfully',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to update story',
      });
    }
  };

  const handleLike = async () => {
    if (!user || !story || user.id === story.user.id) return;
    
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('story_likes')
          .delete()
          .eq('story_id', story.id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        // Like
        const { error } = await supabase
          .from('story_likes')
          .insert({
            story_id: story.id,
            user_id: user.id
          });
        
        if (error) throw error;
        
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      addToast({
        type: 'error',
        message: 'Failed to update like status'
      });
    }
  };

  const handleTouchStart = () => {
    setIsPaused(true);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
  };

  const handleCaptionDragStart = (e: React.MouseEvent) => {
    if (!captionRef.current || !containerRef.current || !user || !story || user.id !== story.user.id) return;
    
    setIsDraggingCaption(true);
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const captionRect = captionRef.current.getBoundingClientRect();
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    const startLeft = captionRect.left - containerRect.left;
    const startTop = captionRect.top - containerRect.top;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newLeft = startLeft + (e.clientX - startX);
      const newTop = startTop + (e.clientY - startY);
      
      // Constrain to container bounds
      const maxLeft = containerRect.width - captionRect.width;
      const maxTop = containerRect.height - captionRect.height;
      
      const boundedLeft = Math.max(0, Math.min(newLeft, maxLeft));
      const boundedTop = Math.max(0, Math.min(newTop, maxTop));
      
      setCaptionPosition({
        x: boundedLeft / containerRect.width * 100, // Store as percentage
        y: boundedTop / containerRect.height * 100
      });
    };
    
    const handleMouseUp = () => {
      setIsDraggingCaption(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!story) return null;

  const isOwnStory = user?.id === story.user.id;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={handleClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative w-full h-full md:w-[400px] md:h-[700px]"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 p-2 z-10 flex gap-1">
          {userStories.map((s, index) => (
            <div
              key={s.id}
              className="flex-1 h-0.5 bg-white/30 overflow-hidden rounded-full"
            >
              <motion.div
                className="h-full bg-white"
                initial={{ width: index < currentStoryIndex ? '100%' : '0%' }}
                animate={{
                  width: index < currentStoryIndex
                    ? '100%'
                    : index === currentStoryIndex
                    ? `${progress}%`
                    : '0%'
                }}
                transition={{ 
                  duration: index === currentStoryIndex ? STORY_DURATION / 1000 : 0,
                  ease: 'linear'
                }}
              />
            </div>
          ))}
        </div>

        {/* Story content */}
        <img
          src={story.media_url}
          alt="Story"
          className="w-full h-full object-cover"
        />

        {/* Story header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <img
                src={story.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${story.user.username}`}
                alt={story.user.username}
                className="w-8 h-8 rounded-full border-2 border-white"
              />
              <div>
                <p className="text-white font-medium">{story.user.username}</p>
                <p className="text-white/70 text-sm">
                  {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOwnStory && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActions(!showActions);
                      setIsPaused(true);
                    }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <MoreHorizontal className="h-6 w-6 text-white" />
                  </button>
                  <AnimatePresence>
                    {showActions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-200 rounded-md shadow-lg z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowActions(false);
                            setIsEditing(true);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300"
                        >
                          <Edit className="h-4 w-4" />
                          Edit caption
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowActions(false);
                            setShowDeleteConfirm(true);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error-600 hover:bg-gray-100 dark:hover:bg-dark-300"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete story
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Story caption */}
        {story.caption && (
          <div 
            ref={captionRef}
            className={`absolute p-4 max-w-[80%] ${isEditing ? 'cursor-move' : ''}`}
            style={{
              left: `${captionPosition?.x || 10}%`,
              top: `${captionPosition?.y || 70}%`,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '8px',
              backdropFilter: 'blur(4px)'
            }}
            onMouseDown={isEditing ? handleCaptionDragStart : undefined}
          >
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editedCaption}
                  onChange={(e) => setEditedCaption(e.target.value)}
                  className="flex-1 bg-white/10 text-white border-none rounded-md"
                  placeholder="Add a caption..."
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveEdit();
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md"
                >
                  Save
                </button>
              </div>
            ) : (
              <p className="text-white">{story.caption}</p>
            )}
          </div>
        )}

        {/* Story actions */}
        {!isOwnStory && (
          <div className="absolute bottom-20 right-4 z-10 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center">
              <motion.button
                whileTap={{ scale: 1.2 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
              >
                <Heart
                  className={`h-6 w-6 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
                />
              </motion.button>
              <span className="text-xs text-white mt-1 font-medium">
                {likeCount}
              </span>
            </div>
            
            <div className="flex flex-col items-center">
              <motion.button
                whileTap={{ scale: 1.1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Direct message to user
                  navigate(`/messages/${story.user.id}`);
                }}
                className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
              >
                <MessageSquare className="h-6 w-6 text-white" />
              </motion.button>
              <span className="text-xs text-white mt-1 font-medium">Reply</span>
            </div>
            
            <div className="flex flex-col items-center">
              <motion.button
                whileTap={{ scale: 1.1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Share story
                  navigator.share({
                    title: `${story.user.username}'s story`,
                    text: story.caption || `Check out ${story.user.username}'s story!`,
                    url: window.location.href
                  }).catch(() => {
                    navigator.clipboard.writeText(window.location.href);
                    addToast({
                      type: 'success',
                      message: 'Link copied to clipboard!'
                    });
                  });
                }}
                className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
              >
                <Send className="h-6 w-6 text-white" />
              </motion.button>
              <span className="text-xs text-white mt-1 font-medium">Share</span>
            </div>
          </div>
        )}

        {/* Viewers button (for story owner) */}
        {isOwnStory && (
          <div 
            className="absolute bottom-4 left-0 right-0 flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowViewers(true);
                setIsPaused(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-full backdrop-blur-sm text-white"
            >
              <ArrowUp className="h-4 w-4" />
              <span>Seen by {viewCount}</span>
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        {currentStoryIndex > 0 && (
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </button>
        )}
        
        {currentStoryIndex < userStories.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </button>
        )}

        {/* Delete confirmation dialog */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white dark:bg-dark-200 rounded-xl p-6 max-w-sm w-full"
              >
                <h3 className="text-lg font-semibold mb-2">Delete Story</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete this story? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                      setIsPaused(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
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

        {/* Viewers modal */}
        <ViewersModal 
          isOpen={showViewers}
          onClose={() => {
            setShowViewers(false);
            setIsPaused(false);
          }}
          viewers={viewers}
        />
      </motion.div>
    </div>
  );
};

export default StoryViewer;