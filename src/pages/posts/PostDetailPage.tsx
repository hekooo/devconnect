import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowLeft, Heart, MessageSquare, Share2, Bookmark, 
  MoreHorizontal, Edit, Trash2, Eye, Tag, Send, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

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
    bookmarks: number;
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
    full_name?: string;
  };
  _count: {
    likes: number;
  };
}

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (id) {
      fetchPost();
      fetchComments();
      trackView();
    }
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPost = async () => {
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
          comments(count),
          bookmarks(count)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform the data
      const transformedPost = {
        ...data,
        tags: data.tags || [],
        _count: {
          likes: data.likes?.[0]?.count || 0,
          comments: data.comments?.[0]?.count || 0,
          bookmarks: data.bookmarks?.[0]?.count || 0,
        }
      };

      setPost(transformedPost);
      setLikeCount(transformedPost._count.likes);

      // Check if user has liked or bookmarked the post
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
      console.error('Error fetching post:', error);
      if (error.code !== 'PGRST116') { // Ignore "no rows returned" error
        addToast({
          type: 'error',
          message: 'Failed to load post',
        });
        navigate('/');
      }
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
          content,
          post_type,
          images,
          created_at,
          user:profiles (
            username,
            avatar_url
          )
        `)
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
            avatar_url,
            full_name
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
      await supabase.rpc('increment_view_count', { post_id: id });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !post || isProcessingLike) {
      if (!user) {
        addToast({
          type: 'error',
          message: 'Please sign in to like posts',
        });
      }
      return;
    }

    setIsProcessingLike(true);
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ post_id: post.id, user_id: user.id });

        if (error) throw error;

        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });

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
    if (!user || !post) {
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
          .match({ post_id: post.id, user_id: user.id });

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setIsBookmarked(false);
        addToast({
          type: 'success',
          message: 'Removed from bookmarks',
        });
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ post_id: post.id, user_id: user.id });

        if (error) throw error;

        setIsBookmarked(true);
        addToast({
          type: 'success',
          message: 'Added to bookmarks',
        });
      }
    } catch (error) {
      console.error('Error updating bookmark status:', error);
      addToast({
        type: 'error',
        message: 'Failed to update bookmark status',
      });
    }
  };

  const handleShare = async () => {
    if (!post) return;

    try {
      await navigator.share({
        title: post.title || 'DevConnect Post',
        text: post.content,
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
    
    if (!user || !post || !commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
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
            avatar_url,
            full_name
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
      
      addToast({
        type: 'success',
        message: 'Comment added successfully',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      addToast({
        type: 'error',
        message: 'Failed to add comment',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !post || user.id !== post.user_id) return;

    setIsDeleting(true);
    try {
      // Delete any associated images from storage
      if (post.images && post.images.length > 0) {
        const imagePaths = post.images.map(url => {
          const path = url.split('/').pop();
          return `${user.id}/${path}`;
        });

        await supabase.storage
          .from('posts')
          .remove(imagePaths);
      }

      // Delete the post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      addToast({
        type: 'success',
        message: 'Post deleted successfully',
      });

      navigate('/');
    } catch (error) {
      console.error('Error deleting post:', error);
      addToast({
        type: 'error',
        message: 'Failed to delete post',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleFocusComment = () => {
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-dark-300 rounded w-1/4 mb-8" />
        <div className="bg-white dark:bg-dark-200 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gray-200 dark:bg-dark-300 rounded-full" />
            <div>
              <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-dark-300 rounded w-24" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-dark-300 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-5/6" />
            <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">Post not found</h2>
        <Link to="/" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
          <ArrowLeft className="h-5 w-5 inline mr-2" />
          Back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to feed
      </Link>

      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm overflow-hidden">
        {/* Post header */}
        <div className="p-6 border-b border-gray-100 dark:border-dark-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={`/profile/${post.user.id}`}>
                <img
                  src={post.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${post.user.username}`}
                  alt={post.user.full_name || post.user.username}
                  className="h-12 w-12 rounded-full object-cover"
                />
              </Link>
              <div>
                <Link 
                  to={`/profile/${post.user.id}`}
                  className="font-medium hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {post.user.full_name || post.user.username}
                </Link>
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            {user?.id === post.user_id && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-full"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-200 rounded-md shadow-lg z-10"
                    >
                      <Link
                        to={`/posts/edit/${post.id}`}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-300"
                      >
                        <Edit className="h-4 w-4" />
                        Edit post
                      </Link>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error-600 hover:bg-gray-100 dark:hover:bg-dark-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete post
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Post content */}
        <div className="p-6">
          {post.title && (
            <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
          )}

          {post.post_type === 'text' && (
            <div className="prose dark:prose-invert max-w-none mb-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            </div>
          )}

          {post.post_type === 'code' && (
            <div className="mb-6">
              <SyntaxHighlighter
                language={post.code_language || 'javascript'}
                style={atomDark}
                className="rounded-lg !bg-gray-900"
              >
                {post.content}
              </SyntaxHighlighter>
            </div>
          )}

          {post.post_type === 'image' && post.images && post.images.length > 0 && (
            <div className="mb-6">
              {post.content && (
                <p className="mb-4 text-gray-800 dark:text-gray-200">{post.content}</p>
              )}
              <div className={`grid gap-4 ${
                post.images.length === 1 ? 'grid-cols-1' :
                post.images.length === 2 ? 'grid-cols-2' :
                post.images.length === 3 ? 'grid-cols-3' :
                post.images.length === 4 ? 'grid-cols-2 md:grid-cols-4' :
                'grid-cols-2 md:grid-cols-3'
              }`}>
                {post.images.map((image, index) => (
                  <div 
                    key={index} 
                    className={`${
                      post.images.length === 3 && index === 0 ? 'col-span-3 md:col-span-1' : 
                      post.images.length > 4 && index === 0 ? 'col-span-2 md:col-span-2' : 
                      ''
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Post image ${index + 1}`}
                      className="w-full h-auto rounded-lg object-cover"
                      style={{ maxHeight: '600px' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag, index) => (
                <Link
                  key={index}
                  to={`/search?tag=${tag}`}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-dark-400 transition-colors"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {/* Post stats */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 py-4 border-t border-b border-gray-100 dark:border-dark-300">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                <Heart className={`h-5 w-5 ${isLiked ? 'text-error-500 fill-error-500' : ''}`} />
                <span>{likeCount} likes</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-5 w-5" />
                <span>{comments.length} comments</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-5 w-5" />
                <span>{post.view_count || 0} views</span>
              </div>
            </div>
          </div>

          {/* Post actions */}
          <div className="flex items-center justify-between py-4">
            <button
              onClick={handleLike}
              disabled={isProcessingLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isLiked
                  ? 'bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-300'
              } ${isProcessingLike ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isProcessingLike ? (
                <div className="h-5 w-5 border-2 border-error-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              )}
              <span>Like</span>
            </button>
            
            <button
              onClick={handleFocusComment}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
            >
              <MessageSquare className="h-5 w-5" />
              <span>Comment</span>
            </button>

            <button
              onClick={handleBookmark}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isBookmarked
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-300'
              }`}
            >
              <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
              <span>Bookmark</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
            >
              <Share2 className="h-5 w-5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments section */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-6">Comments ({comments.length})</h2>
        
        {/* Comment form */}
        {user ? (
          <div className="bg-white dark:bg-dark-200 rounded-xl p-6 mb-6 shadow-sm">
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div className="flex items-start gap-4">
                <img
                  src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${user.email}`}
                  alt="Your avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <textarea
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="w-full resize-none"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="btn-primary"
                >
                  {isSubmittingComment ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Posting...
                    </div>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post Comment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-200 rounded-xl p-6 mb-6 text-center shadow-sm">
            <p className="mb-4">Sign in to join the conversation</p>
            <Link to="/login" className="btn-primary">Sign In</Link>
          </div>
        )}

        {/* Comments list */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="bg-white dark:bg-dark-200 rounded-xl p-8 text-center shadow-sm">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-dark-200 rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <Link to={`/profile/${comment.user.id}`}>
                    <img
                      src={comment.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${comment.user.username}`}
                      alt={comment.user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <Link to={`/profile/${comment.user.id}`} className="font-medium hover:text-primary-600 dark:hover:text-primary-400">
                        {comment.user.full_name || comment.user.username}
                      </Link>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <button className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        <Heart className="h-4 w-4" />
                        <span>{comment._count.likes}</span>
                      </button>
                      <button className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
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
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Related Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((relatedPost) => (
              <Link
                key={relatedPost.id}
                to={`/posts/${relatedPost.id}`}
                className="bg-white dark:bg-dark-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {relatedPost.images?.[0] && (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={relatedPost.images[0]}
                      alt={relatedPost.title || 'Related post'}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-medium mb-2 line-clamp-2">
                    {relatedPost.title || relatedPost.content.substring(0, 60) + '...'}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <img
                      src={relatedPost.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${relatedPost.user.username}`}
                      alt={relatedPost.user.username}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <span>{relatedPost.user.username}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
              <h3 className="text-lg font-semibold mb-2">Delete Post</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this post? This action cannot be undone.
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

export default PostDetailPage;