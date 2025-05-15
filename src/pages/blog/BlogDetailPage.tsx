import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Heart, MessageSquare, Share2, Edit, Calendar, Eye, Bookmark, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface Blog {
  id: string;
  title: string;
  content: string;
  content_html: string;
  images: string[];
  created_at: string;
  updated_at: string;
  view_count: number;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    bio: string;
  };
  tags: string[];
  _count: {
    likes: number;
    comments: number;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  _count: {
    likes: number;
  };
}

const BlogDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchBlog();
      fetchComments();
      trackView();
    }
  }, [id]);

  const fetchBlog = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:profiles (
            id,
            username,
            full_name,
            avatar_url,
            bio
          ),
          likes(count),
          comments(count)
        `)
        .eq('id', id)
        .eq('post_type', 'blog')
        .single();

      if (error) throw error;

      // Transform the data
      const transformedBlog = {
        ...data,
        _count: {
          likes: data.likes?.[0]?.count || 0,
          comments: data.comments?.[0]?.count || 0,
        }
      };

      setBlog(transformedBlog);
      setLikeCount(transformedBlog._count.likes);

      // Check if user has liked or bookmarked the blog
      if (user) {
        const [{ data: likeData }, { data: bookmarkData }] = await Promise.all([
          supabase
            .from('likes')
            .select()
            .match({ post_id: id, user_id: user.id })
            .maybeSingle(),
          supabase
            .from('bookmarks')
            .select()
            .match({ post_id: id, user_id: user.id })
            .maybeSingle()
        ]);

        setIsLiked(!!likeData);
        setIsBookmarked(!!bookmarkData);
      }

      // Fetch related posts based on tags
      if (data.tags && data.tags.length > 0) {
        fetchRelatedPosts(data.tags, data.id);
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      addToast({
        type: 'error',
        message: 'Failed to load blog post',
      });
      navigate('/blogs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelatedPosts = async (tags: string[], currentPostId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          images,
          created_at,
          user:profiles (
            username,
            avatar_url
          )
        `)
        .eq('post_type', 'blog')
        .eq('status', 'published')
        .neq('id', currentPostId)
        .overlaps('tags', tags)
        .limit(3);

      if (error) throw error;
      setRelatedPosts(data || []);
    } catch (error) {
      console.error('Error fetching related posts:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user:profiles (
            id,
            username,
            avatar_url
          ),
          likes(count)
        `)
        .eq('post_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedComments = data?.map(comment => ({
        ...comment,
        _count: {
          likes: comment.likes?.[0]?.count || 0
        }
      }));

      setComments(transformedComments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const trackView = async () => {
    if (!id) return;

    try {
      // Increment view count
      await supabase.rpc('increment_view_count', { post_id: id });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !blog) {
      addToast({
        type: 'error',
        message: 'Please sign in to like posts',
      });
      return;
    }

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ post_id: blog.id, user_id: user.id });

        if (error) throw error;

        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: blog.id, user_id: user.id });

        if (error) throw error;

        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to update like status',
      });
    }
  };

  const handleBookmark = async () => {
    if (!user || !blog) {
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
          .match({ post_id: blog.id, user_id: user.id });

        if (error) throw error;

        setIsBookmarked(false);
        addToast({
          type: 'success',
          message: 'Removed from bookmarks',
        });
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ post_id: blog.id, user_id: user.id });

        if (error) throw error;

        setIsBookmarked(true);
        addToast({
          type: 'success',
          message: 'Added to bookmarks',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to update bookmark status',
      });
    }
  };

  const handleShare = async () => {
    if (!blog) return;

    try {
      await navigator.share({
        title: blog.title,
        text: blog.title,
        url: window.location.href,
      });
    } catch (error) {
      // Fall back to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
      addToast({
        type: 'success',
        message: 'Link copied to clipboard!',
      });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !blog || !commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: blog.id,
          user_id: user.id,
          content: commentText.trim(),
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

      setComments([
        {
          ...data,
          _count: { likes: 0 }
        },
        ...comments
      ]);
      setCommentText('');
      
      // Update comment count in blog state
      setBlog(prev => {
        if (!prev) return null;
        return {
          ...prev,
          _count: {
            ...prev._count,
            comments: prev._count.comments + 1
          }
        };
      });

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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-dark-300 rounded w-1/4 mb-8" />
        <div className="h-64 bg-gray-200 dark:bg-dark-300 rounded-xl mb-8" />
        <div className="h-12 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-4" />
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-5/6" />
          <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">Blog post not found</h2>
        <Link to="/blogs" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
          <ArrowLeft className="h-5 w-5 inline mr-2" />
          Back to blog posts
        </Link>
      </div>
    );
  }

  const coverImage = blog.images?.[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        to="/blogs"
        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to blog posts
      </Link>

      <article className="bg-white dark:bg-dark-200 rounded-xl shadow-sm overflow-hidden">
        {/* Cover image */}
        {coverImage && (
          <div className="w-full h-[400px] relative">
            <img
              src={coverImage}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        <div className="p-6 md:p-10">
          {/* Blog header */}
          <header className={`${coverImage ? '-mt-20 relative z-10' : ''}`}>
            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {blog.tags.map((tag, index) => (
                  <Link
                    key={index}
                    to={`/blogs?tag=${tag}`}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-900/30 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className={`text-4xl md:text-5xl font-serif font-bold mb-6 ${coverImage ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              {blog.title}
            </h1>

            {/* Author and date */}
            <div className={`flex items-center gap-4 mb-8 ${coverImage ? 'text-white' : ''}`}>
              <Link to={`/profile/${blog.user.id}`} className="flex items-center gap-3">
                <img
                  src={blog.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${blog.user.username}`}
                  alt={blog.user.full_name || blog.user.username}
                  className="h-12 w-12 rounded-full border-2 border-white"
                />
                <div>
                  <div className="font-medium">{blog.user.full_name || blog.user.username}</div>
                  <div className="text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(blog.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </Link>

              {user?.id === blog.user.id && (
                <Link to={`/blogs/edit/${blog.id}`} className="ml-auto px-4 py-2 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-md hover:bg-primary-200 dark:hover:bg-primary-900/30 transition-colors">
                  <Edit className="h-4 w-4 inline mr-2" />
                  Edit
                </Link>
              )}
            </div>
          </header>

          {/* Blog content */}
          <div className="prose prose-lg dark:prose-invert max-w-none font-serif mb-10">
            <div dangerouslySetInnerHTML={{ __html: blog.content_html || blog.content }} />
          </div>

          {/* Blog footer */}
          <footer className="border-t border-gray-200 dark:border-dark-300 pt-6">
            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1">
                  <Heart className={`h-5 w-5 ${isLiked ? 'text-error-500 fill-error-500' : ''}`} />
                  <span>{likeCount} likes</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-5 w-5" />
                  <span>{blog._count.comments} comments</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-5 w-5" />
                  <span>{blog.view_count || 0} views</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1 transition-colors ${
                    isLiked
                      ? 'text-error-600 dark:text-error-400'
                      : 'hover:text-error-600 dark:hover:text-error-400'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                  <span>Like</span>
                </button>
                <button
                  onClick={handleBookmark}
                  className={`flex items-center gap-1 transition-colors ${
                    isBookmarked
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                  <span>Bookmark</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Author bio */}
            {blog.user.bio && (
              <div className="bg-gray-50 dark:bg-dark-300 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-medium mb-2">About the author</h3>
                <p className="text-gray-600 dark:text-gray-300">{blog.user.bio}</p>
              </div>
            )}

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag, index) => (
                    <Link
                      key={index}
                      to={`/blogs?tag=${tag}`}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-dark-400 transition-colors"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </footer>
        </div>
      </article>

      {/* Comments section */}
      <div id="comments" className="mt-10">
        <h2 className="text-2xl font-serif font-bold mb-6">Comments ({blog._count.comments})</h2>
        
        {/* Comment form */}
        {user ? (
          <form onSubmit={handleSubmitComment} className="bg-white dark:bg-dark-200 rounded-xl p-6 mb-8">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full mb-4"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingComment || !commentText.trim()}
                className="btn-primary"
              >
                {isSubmittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white dark:bg-dark-200 rounded-xl p-6 mb-8 text-center">
            <p className="mb-4">Sign in to join the conversation</p>
            <Link to="/login" className="btn-primary">Sign In</Link>
          </div>
        )}

        {/* Comments list */}
        <div className="space-y-6">
          {comments.length === 0 ? (
            <div className="bg-white dark:bg-dark-200 rounded-xl p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-dark-200 rounded-xl p-6"
              >
                <div className="flex items-start gap-4">
                  <Link to={`/profile/${comment.user.id}`}>
                    <img
                      src={comment.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${comment.user.username}`}
                      alt={comment.user.username}
                      className="h-10 w-10 rounded-full"
                    />
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <Link to={`/profile/${comment.user.id}`} className="font-medium">
                        {comment.user.username}
                      </Link>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <button className="hover:text-primary-600 dark:hover:text-primary-400">
                        <Heart className="h-4 w-4 inline mr-1" />
                        {comment._count.likes}
                      </button>
                      <button className="hover:text-primary-600 dark:hover:text-primary-400">
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-serif font-bold mb-6">Related Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blogs/${post.id}`}
                className="bg-white dark:bg-dark-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {post.images?.[0] && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={post.images[0]}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-2 line-clamp-2">{post.title}</h3>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <img
                      src={post.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${post.user.username}`}
                      alt={post.user.username}
                      className="h-6 w-6 rounded-full mr-2"
                    />
                    <span>{post.user.username}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogDetailPage;