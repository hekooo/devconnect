import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import PostCard from '../components/post/PostCard';
import NewPostModal from '../components/post/NewPostModal';
import StoryBar from '../components/story/StoryBar';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../contexts/UserProfileContext';
import supabase from '../lib/supabase';

interface Post {
  id: string;
  user_id: string;
  content: string;
  content_html?: string;
  post_type: 'text' | 'image' | 'code' | 'blog';
  code_language?: string;
  title?: string;
  images?: string[];
  created_at: string;
  user: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  _count: {
    likes: number;
    comments: number;
    bookmarks: number;
  };
}

const HomePage = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'trending' | 'new' | 'following'>('new');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchFollowingIds();
    }
  }, [user]);

  useEffect(() => {
    if (followingIds.length > 0 || (user && followingIds.length === 0)) {
      fetchPosts(true);
    }
  }, [followingIds, feedFilter]);

  useEffect(() => {
    if (page > 1) {
      fetchPosts(false);
    }
  }, [page]);

  const fetchFollowingIds = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id);

      if (error) throw error;
      
      const ids = data?.map(item => item.following_id) || [];
      setFollowingIds(ids);
    } catch (error) {
      console.error('Error fetching following IDs:', error);
    }
  };

  const fetchPosts = async (reset: boolean) => {
    if (!user) return;
    
    if (reset) {
      setIsLoading(true);
      setPage(1);
    }
    
    try {
      // If user is not following anyone, show a message instead of fetching posts
      if (followingIds.length === 0) {
        setPosts([]);
        setHasMore(false);
        return;
      }

      const ITEMS_PER_PAGE = 10;
      const startRange = reset ? 0 : (page - 1) * ITEMS_PER_PAGE;
      const endRange = startRange + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('posts')
        .select(`
          *,
          user:profiles(username, full_name, avatar_url),
          likes:likes(count),
          comments:comments(count),
          bookmarks:bookmarks(count)
        `)
        .in('user_id', followingIds)
        .in('post_type', ['text', 'image', 'code', 'blog'])
        .eq('status', 'published')
        .range(startRange, endRange);

      switch (feedFilter) {
        case 'trending':
          query = query.order('view_count', { ascending: false });
          break;
        case 'new':
        case 'following':
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to include counts
      const postsWithCounts = data?.map(post => ({
        ...post,
        _count: {
          likes: post.likes?.[0]?.count || 0,
          comments: post.comments?.[0]?.count || 0,
          bookmarks: post.bookmarks?.[0]?.count || 0,
        },
      }));

      if (reset) {
        setPosts(postsWithCounts || []);
      } else {
        setPosts(prev => [...prev, ...(postsWithCounts || [])]);
      }
      
      setHasMore((postsWithCounts || []).length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const defaultAvatar = `https://api.dicebear.com/7.x/avatars/svg?seed=${user?.email}`;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Stories */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <StoryBar />
      </motion.div>

      {/* Create post button */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-dark-200 rounded-xl shadow-sm p-4 mb-6"
      >
        <div className="flex gap-4">
          <img
            src={profile?.avatar_url || defaultAvatar}
            alt={profile?.full_name || 'Your profile'}
            className="h-10 w-10 rounded-full object-cover"
          />
          <button
            onClick={() => setIsNewPostModalOpen(true)}
            className="flex-1 bg-gray-100 dark:bg-dark-300 rounded-full py-2.5 px-4 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-dark-400 transition-colors text-left"
          >
            What's on your mind?
          </button>
        </div>
      </motion.div>

      {/* Feed filters */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 mb-6 border-b border-gray-200 dark:border-dark-300"
      >
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            feedFilter === 'new'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
          onClick={() => setFeedFilter('new')}
        >
          New
          {feedFilter === 'new' && (
            <motion.div
              layoutId="feedFilterIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
            />
          )}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            feedFilter === 'trending'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
          onClick={() => setFeedFilter('trending')}
        >
          Trending
          {feedFilter === 'trending' && (
            <motion.div
              layoutId="feedFilterIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
            />
          )}
        </button>
      </motion.div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-dark-200 rounded-xl shadow-sm p-4 animate-pulse"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-dark-300 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-1/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-dark-300 rounded w-1/5" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {followingIds.length === 0 ? (
            <div className="bg-white dark:bg-dark-200 rounded-xl p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold mb-2">Your feed is empty</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Follow some users to see their posts in your feed
              </p>
              <Link 
                to="/explore" 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Discover users to follow
              </Link>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-dark-200 rounded-xl p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold mb-2">No posts yet</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Users you follow haven't posted anything yet
              </p>
              <button
                onClick={() => setIsNewPostModalOpen(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Create the first post
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMore}
                    className="px-6 py-2 bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-300 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors shadow-sm"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* New Post Modal */}
      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
      />
    </div>
  );
};

export default HomePage;