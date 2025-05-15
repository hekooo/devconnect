import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import BlogEditor from '../../components/blog/BlogEditor';
import supabase from '../../lib/supabase';

const BlogEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [blog, setBlog] = useState(null);
  const [isLoading, setIsLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      fetchBlog();
    }
  }, [id]);

  const fetchBlog = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          tags:content_tags(
            tag:tags(
              name
            )
          )
        `)
        .eq('id', id)
        .eq('post_type', 'blog')
        .single();

      if (error) throw error;

      if (data.user_id !== user?.id) {
        addToast({
          type: 'error',
          message: 'You do not have permission to edit this blog post',
        });
        navigate('/blogs');
        return;
      }

      // Transform tags data
      const transformedBlog = {
        ...data,
        tags: data.tags.map((t: any) => t.tag.name),
      };

      setBlog(transformedBlog);
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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-dark-300 rounded w-1/4 mb-8" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-dark-300 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-dark-300 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <h1 className="text-3xl font-bold">
          {id ? 'Edit Blog Post' : 'Create New Blog Post'}
        </h1>
      </div>

      <BlogEditor initialId={id} initialData={blog} />
    </div>
  );
};

export default BlogEditorPage;