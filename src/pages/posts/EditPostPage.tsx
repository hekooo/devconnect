import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, X, Code, Eye, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import Editor from "@monaco-editor/react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface PostFormData {
  content: string;
  title?: string;
  code_language?: string;
  images?: FileList;
  post_type: 'text' | 'image' | 'code';
}

const EditPostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [editorContent, setEditorContent] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PostFormData>();

  const postType = watch('post_type');
  const codeLanguage = watch('code_language');

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Verify ownership
      if (post.user_id !== user?.id) {
        addToast({
          type: 'error',
          message: 'You do not have permission to edit this post',
        });
        navigate('/');
        return;
      }

      // Set form values
      setValue('content', post.content);
      setValue('title', post.title);
      setValue('code_language', post.code_language);
      setValue('post_type', post.post_type);
      setEditorContent(post.content);
      setCurrentImages(post.images || []);
    } catch (error) {
      console.error('Error fetching post:', error);
      addToast({
        type: 'error',
        message: 'Failed to load post',
      });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (files: FileList): Promise<string[]> => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const onSubmit = async (data: PostFormData) => {
    if (!user || !id) return;

    setIsSubmitting(true);
    try {
      let images = currentImages;

      // Handle new image uploads
      if (data.images?.length > 0) {
        const newImages = await handleImageUpload(data.images);
        images = [...currentImages, ...newImages];
      }

      // Update the post
      const { error } = await supabase
        .from('posts')
        .update({
          content: postType === 'code' ? editorContent : data.content,
          title: data.title,
          code_language: data.code_language,
          images,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      addToast({
        type: 'success',
        message: 'Post updated successfully!',
      });

      navigate(`/posts/${id}`);
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update post',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const filePath = `${user?.id}/${urlParts[urlParts.length - 1]}`;

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('posts')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update state
      setCurrentImages(currentImages.filter(img => img !== imageUrl));
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to remove image',
      });
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-dark-300 rounded w-1/4 mb-8" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-dark-300 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-dark-300 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <h1 className="text-3xl font-bold">Edit Post</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-200 rounded-xl p-6"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title field for code posts */}
          {postType === 'code' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Title
              </label>
              <input
                type="text"
                className="w-full"
                placeholder="Give your code snippet a title"
                {...register('title')}
              />
            </div>
          )}

          {/* Code language selector for code posts */}
          {postType === 'code' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Language
              </label>
              <select
                className="w-full"
                {...register('code_language')}
                defaultValue="javascript"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="ruby">Ruby</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="php">PHP</option>
                <option value="csharp">C#</option>
              </select>
            </div>
          )}

          {/* Content field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Content
              </label>
              {postType === 'code' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPreview(!isPreview)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                      isPreview
                        ? 'bg-gray-100 dark:bg-dark-300'
                        : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    }`}
                  >
                    {isPreview ? (
                      <>
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Preview
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {postType === 'code' ? (
              <div className="border border-gray-200 dark:border-dark-300 rounded-lg overflow-hidden">
                <AnimatePresence mode="wait">
                  {isPreview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="min-h-[400px]"
                    >
                      <SyntaxHighlighter
                        language={codeLanguage || 'javascript'}
                        style={atomDark}
                        className="!m-0 !rounded-none h-full"
                      >
                        {editorContent}
                      </SyntaxHighlighter>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="editor"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="min-h-[400px]"
                    >
                      <Editor
                        height="400px"
                        defaultLanguage={codeLanguage || 'javascript'}
                        language={codeLanguage || 'javascript'}
                        theme="vs-dark"
                        value={editorContent}
                        onChange={handleEditorChange}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          roundedSelection: false,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <textarea
                rows={postType === 'code' ? 10 : 4}
                className={`w-full ${postType === 'code' ? 'font-mono' : ''}`}
                placeholder={
                  postType === 'code'
                    ? 'Paste your code here...'
                    : "What's on your mind?"
                }
                {...register('content', { required: 'Content is required' })}
              />
            )}
            {errors.content && (
              <p className="mt-1 text-sm text-error-600">{errors.content.message}</p>
            )}
          </div>

          {/* Image upload for image posts */}
          {postType === 'image' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Images
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {currentImages.map((image, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(image)}
                      className="absolute top-2 right-2 p-1 bg-error-600 text-white rounded-full hover:bg-error-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="block w-full cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  {...register('images')}
                />
                <div className="border-2 border-dashed border-gray-300 dark:border-dark-400 rounded-lg p-8 text-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click to add more images
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Saving...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditPostPage;