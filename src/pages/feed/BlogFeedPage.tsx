import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import supabase from '../../lib/supabase';

interface Blog {
  id: string;
  title: string;
  content: string;
  content_html: string;
  images: string[];
  created_at: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  tags: string[];
  _count: {
    likes: number;
    comments: number;
    view_count: number;
  };
}

const BlogFeedPage = () => {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const ITEMS_PER_PAGE = 12;

  // Fetch following IDs
  useEffect(() => {
    if (user) {
      fetchFollowingIds();
    }
  }, [user]);

  // Fetch blogs when dependencies change
  useEffect(() => {
    if (user && followingIds.length >= 0) {
      fetchBlogs();
    }
  }, [selectedTag, searchQuery, page, followingIds]);

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

  const fetchBlogs = async () => {
    setIsLoading(true);
    try {
      // If user is not following anyone, show empty state
      if (followingIds.length === 0) {
        setBlogs([]);
        setHasMore(false);
        return;
      }

      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          content_html,
          content,
          images,
          created_at,
          view_count,
          tags,
          user:profiles(
            id,
            username,
            full_name,
            avatar_url
          ),
          likes(count),
          comments(count)
        `)
        .in('user_id', followingIds)
        .eq('post_type', 'blog')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (selectedTag) {
        query = query.contains('tags', [selectedTag]);
      }
      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,content_html.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const transformed = (data || []).map((blog) => ({
        ...blog,
        _count: {
          likes: blog.likes?.[0]?.count || 0,
          comments: blog.comments?.[0]?.count || 0,
          view_count: blog.view_count || 0,
        },
      }));

      setBlogs((prev) =>
        page === 1 ? transformed : [...prev, ...transformed]
      );
      setHasMore(transformed.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error('Error fetching blogs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore) setPage((prev) => prev + 1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Blog Posts</h1>
        <Link to="/blogs/new" className="btn-primary">
          <PlusCircle className="h-5 w-5 mr-2" />
          Write a Post
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search blog posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Blog posts */}
          {isLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-dark-200 rounded-xl p-6 animate-pulse"
                >
                  <div className="h-48 bg-gray-200 dark:bg-dark-300 rounded-lg mb-4" />
                  <div className="h-8 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : followingIds.length === 0 ? (
            <div className="bg-white dark:bg-dark-200 rounded-xl p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold mb-2">Your feed is empty</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Follow some users to see their blog posts in your feed
              </p>
              <Link 
                to="/explore" 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Discover users to follow
              </Link>
            </div>
          ) : blogs.length === 0 ? (
            <div className="bg-white dark:bg-dark-200 rounded-xl p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold mb-2">No blog posts found</h2>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? `No posts match "${searchQuery}"`
                  : selectedTag
                  ? `No posts found with tag "${selectedTag}"`
                  : "Users you follow haven't published any blog posts yet"}
              </p>
            </div>
          ) : (
            <>
              <div
                className={`grid gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : ''
                }`}
              >
                {blogs.map((blog, index) => (
                  <motion.div
                    key={blog.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-dark-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Link to={`/blogs/${blog.id}`}>
                      {blog.images && blog.images.length > 0 && (
                        <div className="w-full h-48 overflow-hidden">
                          <img
                            src={blog.images[0]}
                            alt={blog.title}
                            className="w-full h-full object-cover transition-transform hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <h2 className="text-xl font-semibold mb-2 line-clamp-2">
                          {blog.title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                          {blog.content ? blog.content.replace(/<[^>]*>/g, '') : ''}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                blog.user.avatar_url ||
                                `https://api.dicebear.com/7.x/avatars/svg?seed=${blog.user.username}`
                              }
                              alt={blog.user.full_name}
                              className="h-6 w-6 rounded-full"
                            />
                            <span className="text-gray-600 dark:text-gray-400">
                              {blog.user.full_name || blog.user.username}
                            </span>
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {new Date(blog.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button onClick={loadMore} className="btn-outline">
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-72">
          <div className="bg-white dark:bg-dark-200 rounded-xl p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Popular Tags</h3>
            <div className="space-y-2">
              {/* Tag filters */}
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-primary-600 dark:text-primary-400 text-sm hover:underline mb-2 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="m15 18-6-6 6-6"/></svg>
                  Clear filter
                </button>
              )}
              
              {/* We could fetch popular tags here */}
              {['JavaScript', 'React', 'TypeScript', 'Node.js', 'Web Development'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTag === tag
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogFeedPage;