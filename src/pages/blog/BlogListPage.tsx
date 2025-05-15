import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import supabase from '../../lib/supabase';

interface Blog {
  id: string;
  title: string;
  summary: string;
  cover_image: string;
  published_at: string;
  user: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  _count: {
    likes: number;
    comments: number;
    views: number;
  };
  tags: {
    name: string;
    slug: string;
  }[];
}

const BlogListPage = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBlogs();
  }, [selectedTag, searchQuery]);

  const fetchBlogs = async () => {
    try {
      let query = supabase
        .from('blogs')
        .select(`
          *,
          user:profiles (
            username,
            full_name,
            avatar_url
          ),
          tags:blog_tag_relations (
            tag:blog_tags (
              name,
              slug
            )
          ),
          _count {
            likes: blog_likes(count),
            comments: blog_comments(count),
            views: blog_views(count)
          }
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (selectedTag) {
        query = query.contains('tags', [{ slug: selectedTag }]);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setBlogs(data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Blog Posts</h1>
        <Link to="/blog/new" className="btn-primary">
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
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog, index) => (
                <motion.div
                  key={blog.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-dark-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <Link to={`/blog/${blog.id}`}>
                    {blog.cover_image && (
                      <img
                        src={blog.cover_image}
                        alt={blog.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <h2 className="text-xl font-semibold mb-2 line-clamp-2">
                        {blog.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                        {blog.summary}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <img
                            src={blog.user.avatar_url}
                            alt={blog.user.full_name}
                            className="h-6 w-6 rounded-full"
                          />
                          <span className="text-gray-600 dark:text-gray-400">
                            {blog.user.full_name}
                          </span>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {new Date(blog.published_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-72">
          <div className="bg-white dark:bg-dark-200 rounded-xl p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Popular Tags</h3>
            <div className="space-y-2">
              {/* Add tag list here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogListPage;