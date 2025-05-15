import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bookmark, Grid, List, Search, X, Filter, Play, 
  Trash2, MoreHorizontal, ExternalLink, Tag, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../contexts/ThemeContext';
import supabase from '../lib/supabase';

type BookmarkTab = 'posts' | 'reels';
type ViewMode = 'grid' | 'list';

interface BookmarkedPost {
  id: string;
  post: {
    id: string;
    title: string;
    content: string;
    content_html?: string;
    post_type: 'text' | 'image' | 'code' | 'blog';
    images?: string[];
    created_at: string;
    user: {
      username: string;
      full_name: string;
      avatar_url: string;
    };
    tags?: string[];
  };
}

interface BookmarkedReel {
  id: string;
  reel: {
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    thumbnail_url: string | null;
    created_at: string;
    user: {
      username: string;
      full_name: string;
      avatar_url: string;
    };
    tags?: string[];
  };
}

const BookmarksPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<BookmarkTab>('posts');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [bookmarkedPosts, setBookmarkedPosts] = useState<BookmarkedPost[]>([]);
  const [bookmarkedReels, setBookmarkedReels] = useState<BookmarkedReel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoveredReel, setHoveredReel] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      if (activeTab === 'posts') {
        fetchBookmarkedPosts();
      } else {
        fetchBookmarkedReels();
      }
    }
  }, [user, activeTab, searchQuery, selectedTag]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchBookmarkedPosts = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('bookmarks')
        .select(`
          id,
          post:posts (
            id,
            title,
            content,
            content_html,
            post_type,
            images,
            created_at,
            tags,
            user:profiles (
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user?.id)
        .not('post', 'is', null);

      const { data, error } = await query;

      if (error) throw error;

      // Filter by search query if provided
      let filteredData = data || [];
      if (searchQuery) {
        filteredData = filteredData.filter(item => 
          item.post.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          item.post.content?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Filter by tag if selected
      if (selectedTag) {
        filteredData = filteredData.filter(item => 
          item.post.tags?.includes(selectedTag)
        );
      }

      setBookmarkedPosts(filteredData);

      // Extract all unique tags for filtering
      const allTags = filteredData.flatMap(item => item.post.tags || []);
      setAvailableTags([...new Set(allTags)]);
    } catch (error) {
      console.error('Error fetching bookmarked posts:', error);
      addToast({
        type: 'error',
        message: 'Failed to load bookmarked posts',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookmarkedReels = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('saved_reels')
        .select(`
          id,
          reel:developer_reels (
            id,
            title,
            description,
            video_url,
            thumbnail_url,
            created_at,
            tags,
            user:profiles (
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user?.id);

      const { data, error } = await query;

      if (error) throw error;

      // Filter by search query if provided
      let filteredData = data || [];
      if (searchQuery) {
        filteredData = filteredData.filter(item => 
          item.reel.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          item.reel.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Filter by tag if selected
      if (selectedTag) {
        filteredData = filteredData.filter(item => 
          item.reel.tags?.includes(selectedTag)
        );
      }

      setBookmarkedReels(filteredData);

      // Extract all unique tags for filtering
      const allTags = filteredData.flatMap(item => item.reel.tags || []);
      setAvailableTags([...new Set(allTags)]);
    } catch (error) {
      console.error('Error fetching bookmarked reels:', error);
      addToast({
        type: 'error',
        message: 'Failed to load bookmarked reels',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeBookmark = async (id: string) => {
    setIsDeleting(true);
    try {
      if (activeTab === 'posts') {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setBookmarkedPosts(bookmarkedPosts.filter(item => item.id !== id));
      } else {
        const { error } = await supabase
          .from('saved_reels')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setBookmarkedReels(bookmarkedReels.filter(item => item.id !== id));
      }

      addToast({
        type: 'success',
        message: `Removed from bookmarks`,
      });
    } catch (error) {
      console.error('Error removing bookmark:', error);
      addToast({
        type: 'error',
        message: 'Failed to remove bookmark',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(null);
    }
  };

  const handleReelMouseEnter = (reelId: string) => {
    setHoveredReel(reelId);
    const videoElement = videoRefs.current[reelId];
    if (videoElement) {
      videoElement.currentTime = 0;
      videoElement.play().catch(err => console.error('Error playing video:', err));
    }
  };

  const handleReelMouseLeave = (reelId: string) => {
    setHoveredReel(null);
    const videoElement = videoRefs.current[reelId];
    if (videoElement) {
      videoElement.pause();
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Bookmark className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          <h1 className="text-3xl font-bold">Bookmarks</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-full border border-gray-200 dark:border-dark-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex bg-gray-100 dark:bg-dark-300 rounded-full p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-dark-200 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              aria-label="Grid view"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-full ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-dark-200 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              aria-label="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm p-4 sticky top-6">
            <h2 className="font-semibold mb-4">Categories</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('posts')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'posts'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <Bookmark className="h-5 w-5" />
                <span>Saved Posts</span>
                <span className="ml-auto bg-gray-100 dark:bg-dark-300 px-2 py-0.5 rounded-full text-xs">
                  {bookmarkedPosts.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('reels')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'reels'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <Play className="h-5 w-5" />
                <span>Saved Reels</span>
                <span className="ml-auto bg-gray-100 dark:bg-dark-300 px-2 py-0.5 rounded-full text-xs">
                  {bookmarkedReels.length}
                </span>
              </button>
            </nav>

            {availableTags.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">Filter by Tag</h2>
                  {selectedTag && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        selectedTag === tag
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                      }`}
                    >
                      <Tag className="h-4 w-4" />
                      <span className="truncate">{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {isLoading ? (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-dark-200 rounded-xl overflow-hidden shadow-sm animate-pulse"
                >
                  <div className="h-48 bg-gray-200 dark:bg-dark-300" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-gray-200 dark:bg-dark-300 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'posts' && (
                <>
                  {bookmarkedPosts.length === 0 ? (
                    <div className="bg-white dark:bg-dark-200 rounded-xl p-12 text-center">
                      <Bookmark className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h2 className="text-xl font-semibold mb-2">No saved posts</h2>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {searchQuery || selectedTag
                          ? "No posts match your filters"
                          : "You haven't saved any posts yet"}
                      </p>
                      {(searchQuery || selectedTag) && (
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={`${
                      viewMode === 'grid' 
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                        : 'space-y-6'
                    }`}>
                      {bookmarkedPosts.map((bookmark) => (
                        <motion.div
                          key={bookmark.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group bg-white dark:bg-dark-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          {bookmark.post.images && bookmark.post.images.length > 0 && (
                            <div className="relative h-48 overflow-hidden">
                              <img
                                src={bookmark.post.images[0]}
                                alt={bookmark.post.title || 'Post image'}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold line-clamp-2">
                                {bookmark.post.title || bookmark.post.content?.substring(0, 60) || 'Untitled post'}
                              </h3>
                              
                              <div className="relative ml-2" ref={showActionsMenu === bookmark.id ? actionsMenuRef : undefined}>
                                <button
                                  onClick={() => setShowActionsMenu(showActionsMenu === bookmark.id ? null : bookmark.id)}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                
                                <AnimatePresence>
                                  {showActionsMenu === bookmark.id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute right-0 mt-1 w-48 bg-white dark:bg-dark-200 rounded-lg shadow-lg border border-gray-200 dark:border-dark-300 overflow-hidden z-10"
                                    >
                                      <Link
                                        to={`/posts/${bookmark.post.id}`}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-dark-300"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        View post
                                      </Link>
                                      <button
                                        onClick={() => {
                                          setShowDeleteConfirm(bookmark.id);
                                          setShowActionsMenu(null);
                                        }}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-error-600 hover:bg-gray-100 dark:hover:bg-dark-300"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Remove bookmark
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                              {bookmark.post.content?.replace(/<[^>]*>/g, '').substring(0, 120)}
                            </p>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <img
                                  src={bookmark.post.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${bookmark.post.user.username}`}
                                  alt={bookmark.post.user.username}
                                  className="w-5 h-5 rounded-full"
                                />
                                <span>{bookmark.post.user.full_name || bookmark.post.user.username}</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(bookmark.post.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            {bookmark.post.tags && bookmark.post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {bookmark.post.tags.slice(0, 3).map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-0.5 bg-gray-100 dark:bg-dark-300 rounded-full text-xs"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {bookmark.post.tags.length > 3 && (
                                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-300 rounded-full text-xs">
                                    +{bookmark.post.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'reels' && (
                <>
                  {bookmarkedReels.length === 0 ? (
                    <div className="bg-white dark:bg-dark-200 rounded-xl p-12 text-center">
                      <Play className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h2 className="text-xl font-semibold mb-2">No saved reels</h2>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {searchQuery || selectedTag
                          ? "No reels match your filters"
                          : "You haven't saved any reels yet"}
                      </p>
                      {(searchQuery || selectedTag) && (
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={`${
                      viewMode === 'grid' 
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                        : 'space-y-6'
                    }`}>
                      {bookmarkedReels.map((bookmark) => (
                        <motion.div
                          key={bookmark.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group bg-white dark:bg-dark-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <Link to={`/reels/${bookmark.reel.id}`}>
                            <div 
                              className="relative aspect-[9/16] bg-black"
                              onMouseEnter={() => handleReelMouseEnter(bookmark.reel.id)}
                              onMouseLeave={() => handleReelMouseLeave(bookmark.reel.id)}
                            >
                              {bookmark.reel.thumbnail_url ? (
                                <img
                                  src={bookmark.reel.thumbnail_url}
                                  alt={bookmark.reel.title}
                                  className={`w-full h-full object-cover ${
                                    hoveredReel === bookmark.reel.id ? 'opacity-0' : 'opacity-100'
                                  } transition-opacity duration-300`}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                  <Play className="h-12 w-12 text-white opacity-50" />
                                </div>
                              )}
                              
                              <video
                                ref={el => {
                                  if (el) videoRefs.current[bookmark.reel.id] = el;
                                }}
                                src={bookmark.reel.video_url}
                                className={`absolute inset-0 w-full h-full object-cover ${
                                  hoveredReel === bookmark.reel.id ? 'opacity-100' : 'opacity-0'
                                } transition-opacity duration-300`}
                                muted
                                playsInline
                                loop
                              />
                              
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                <div className="flex items-center justify-center">
                                  <div className="bg-white/30 backdrop-blur-sm rounded-full p-3">
                                    <Play className="h-8 w-8 text-white" fill="white" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold line-clamp-2">
                                {bookmark.reel.title}
                              </h3>
                              
                              <div className="relative ml-2" ref={showActionsMenu === bookmark.id ? actionsMenuRef : undefined}>
                                <button
                                  onClick={() => setShowActionsMenu(showActionsMenu === bookmark.id ? null : bookmark.id)}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                
                                <AnimatePresence>
                                  {showActionsMenu === bookmark.id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute right-0 mt-1 w-48 bg-white dark:bg-dark-200 rounded-lg shadow-lg border border-gray-200 dark:border-dark-300 overflow-hidden z-10"
                                    >
                                      <Link
                                        to={`/reels/${bookmark.reel.id}`}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-dark-300"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        View reel
                                      </Link>
                                      <button
                                        onClick={() => {
                                          setShowDeleteConfirm(bookmark.id);
                                          setShowActionsMenu(null);
                                        }}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-error-600 hover:bg-gray-100 dark:hover:bg-dark-300"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Remove bookmark
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                            
                            {bookmark.reel.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                                {bookmark.reel.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <img
                                  src={bookmark.reel.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${bookmark.reel.user.username}`}
                                  alt={bookmark.reel.user.username}
                                  className="w-5 h-5 rounded-full"
                                />
                                <span>{bookmark.reel.user.full_name || bookmark.reel.user.username}</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(bookmark.reel.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            {bookmark.reel.tags && bookmark.reel.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {bookmark.reel.tags.slice(0, 3).map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-0.5 bg-gray-100 dark:bg-dark-300 rounded-full text-xs"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {bookmark.reel.tags.length > 3 && (
                                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-300 rounded-full text-xs">
                                    +{bookmark.reel.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
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
              className="bg-white dark:bg-dark-200 rounded-xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Remove Bookmark</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to remove this item from your bookmarks? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeBookmark(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-error-600 hover:bg-error-700 rounded-md disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                      Removing...
                    </>
                  ) : (
                    'Remove'
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

export default BookmarksPage;