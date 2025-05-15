import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Image as ImageIcon, Code, Calendar, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PostFormData {
  content: string;
  title?: string;
  code_language?: string;
  images?: FileList;
  scheduled_at?: string;
  post_type: 'text' | 'image' | 'code' | 'blog';
}

const NewPostModal: React.FC<NewPostModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { addToast } = useToast();
  const [postType, setPostType] = useState<'text' | 'image' | 'code' | 'blog'>('text');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PostFormData>();

  const handleClose = () => {
    reset();
    setPostType('text');
    onClose();
  };

  const onSubmit = async (data: PostFormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      let imageUrls: string[] = [];

      // Upload images if present
      if (data.images && data.images.length > 0) {
        const files = Array.from(data.images);
        const uploadPromises = files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('post-images')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(filePath);

          return publicUrl;
        });

        imageUrls = await Promise.all(uploadPromises);
      }

      // Create the post
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: data.content,
          post_type: postType,
          title: data.title,
          code_language: data.code_language,
          images: imageUrls.length > 0 ? imageUrls : null,
          scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString() : null,
          status: data.scheduled_at ? 'scheduled' : 'published',
        });

      if (error) throw error;

      addToast({
        type: 'success',
        message: 'Post created successfully!',
      });

      handleClose();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create post',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultAvatar = "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-dark-200 rounded-xl shadow-xl w-full max-w-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-300">
            <h2 className="text-xl font-semibold">Create Post</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            {/* User info */}
            <div className="flex items-center gap-3 mb-6">
              <img
                src={profile?.avatar_url || defaultAvatar}
                alt={profile?.full_name || 'Your profile'}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <div className="font-medium">{profile?.full_name || user?.email?.split('@')[0]}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {profile?.username || user?.email}
                </div>
              </div>
            </div>

            {/* Post type selection */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setPostType('text')}
                className={`flex-1 py-2 px-4 rounded-md ${
                  postType === 'text'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setPostType('image')}
                className={`flex-1 py-2 px-4 rounded-md ${
                  postType === 'image'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <ImageIcon className="h-5 w-5 mx-auto" />
              </button>
              <button
                onClick={() => setPostType('code')}
                className={`flex-1 py-2 px-4 rounded-md ${
                  postType === 'code'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <Code className="h-5 w-5 mx-auto" />
              </button>
              <button
                onClick={() => setPostType('blog')}
                className={`flex-1 py-2 px-4 rounded-md ${
                  postType === 'blog'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                Blog
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {(postType === 'blog' || postType === 'code') && (
                <div>
                  <input
                    type="text"
                    placeholder={postType === 'blog' ? 'Blog title' : 'Code snippet title'}
                    className="w-full"
                    {...register('title', {
                      required: postType === 'blog' ? 'Title is required' : false,
                    })}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-error-600">{errors.title.message}</p>
                  )}
                </div>
              )}

              {postType === 'code' && (
                <div>
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

              <div>
                <textarea
                  placeholder={
                    postType === 'text'
                      ? "What's on your mind?"
                      : postType === 'image'
                      ? 'Add a caption...'
                      : postType === 'code'
                      ? 'Paste your code here...'
                      : 'Write your blog post...'
                  }
                  rows={postType === 'blog' ? 10 : 4}
                  className="w-full"
                  {...register('content', { required: 'Content is required' })}
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-error-600">{errors.content.message}</p>
                )}
              </div>

              {postType === 'image' && (
                <div>
                  <label className="block w-full cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      {...register('images')}
                    />
                    <div className="border-2 border-dashed border-gray-300 dark:border-dark-400 rounded-lg p-8 text-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Click to upload images
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-dark-300">
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
                    <input
                      type="datetime-local"
                      className="hidden"
                      {...register('scheduled_at')}
                    />
                    <Calendar className="h-4 w-4" />
                    <span>Schedule</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Posting...
                      </div>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-1" />
                        Post
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NewPostModal;