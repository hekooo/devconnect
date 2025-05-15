import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import PostCard from '../../components/post/PostCard';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Post {
  id: string;
  user_id: string;
  content: string;
  content_html?: string;
  post_type: 'text' | 'image' | 'code';
  code_language?: string;
  title?: string;
  images?: string[];
  created_at: string;
  user: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  likes: number;
  comments: number;
  bookmarks: number;
}

type FeedFilter = 'trending' | 'recent';

const StandardFeedPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const ITEMS_PER_PAGE = 10;

  // Fetch following IDs
  useEffect(() => {
    if (user) {
      fetchFollowingIds();
    }
  }, [user]);

  // Fetch posts when filter, search, or following IDs change
  useEffect(() => {
    if (user && followingIds.length >= 0) {
      fetchPosts();
    }
  }, [filter, searchQuery, followingIds]);

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

  const fetchPosts = async () => {
    try {
      // If user is not following anyone, show empty state
      if (followingIds.length === 0) {
        setPosts([]);
        setHasMore(false);
        setIsLoading(false);
        return;
      }

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
        .in('post_type', ['text', 'image', 'code'])
        .eq('status', 'published')
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (searchQuery) {
        query = query.or(`content.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`);
      }

      switch (filter) {
        case 'trending':
          query = query.order('view_count', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      if (page === 1) {
        setPosts(data || []);
      } else {
        setPosts(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data || []).length === ITEMS_PER_PAGE);
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

  const handleDeletePost = async (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Feed</h1>
        <Link to="/posts/new" className="btn-primary">
          <PlusCircle className="h-5 w-5 mr-2" />
          Create Post
        </Link>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <button
            onClick={() => setFilter('recent')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'recent'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-dark-300'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setFilter('trending')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'trending'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-dark-300'
            }`}
          >
            Trending
          </button>
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-dark-200 rounded-xl p-6 animate-pulse"
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
      ) : followingIds.length === 0 ? (
        <div className="text-center py-12">
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
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No posts found</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery
              ? `No posts match "${searchQuery}"`
              : "Users you follow haven't posted anything yet"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <PostCard post={post} onDelete={() => handleDeletePost(post.id)} />
              </motion.div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                className="btn-outline"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StandardFeedPage;