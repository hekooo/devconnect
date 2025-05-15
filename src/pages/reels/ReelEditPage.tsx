import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Tag, Video, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface ReelFormData {
  title: string;
  description: string;
  tags: string;
}

const ReelEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      fetchReel();
    }
  }, [id]);

  const fetchReel = async () => {
    try {
      const { data, error } = await supabase
        .from('developer_reels')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Verify ownership
      if (data.user_id !== user?.id) {
        addToast({
          type: 'error',
          message: 'You do not have permission to edit this reel',
        });
        navigate('/explore');
        return;
      }

      // Set form values
      setTitle(data.title);
      setDescription(data.description || '');
      setTags(data.tags ? data.tags.join(', ') : '');
      setVideoUrl(data.video_url);
      setThumbnailUrl(data.thumbnail_url || '');
      
      if (data.thumbnail_url) {
        setThumbnailPreview(data.thumbnail_url);
      }
    } catch (error) {
      console.error('Error fetching reel:', error);
      addToast({
        type: 'error',
        message: 'Failed to load reel',
      });
      navigate('/explore');
    } finally {
      setIsLoading(false);
    }
  };

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        addToast({
          type: 'error',
          message: 'Please select a valid image file for the thumbnail.',
        });
        return;
      }

      setThumbnailFile(file);
      
      // Create thumbnail preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !id) return;
    
    if (!title.trim()) {
      addToast({
        type: 'error',
        message: 'Please provide a title for your reel.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload new thumbnail if provided
      let newThumbnailUrl = thumbnailUrl;
      if (thumbnailFile) {
        const thumbnailFileExt = thumbnailFile.name.split('.').pop();
        const thumbnailFileName = `${Date.now()}.${thumbnailFileExt}`;
        const thumbnailFilePath = `${user.id}/${thumbnailFileName}`;

        const { error: thumbnailUploadError } = await supabase.storage
          .from('reel-thumbnails')
          .upload(thumbnailFilePath, thumbnailFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (thumbnailUploadError) throw thumbnailUploadError;

        // Get thumbnail URL
        const { data: { publicUrl: thumbUrl } } = supabase.storage
          .from('reel-thumbnails')
          .getPublicUrl(thumbnailFilePath);
        
        newThumbnailUrl = thumbUrl;
      }

      // 2. Update reel record in database
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

      const { error: reelError } = await supabase
        .from('developer_reels')
        .update({
          title,
          description: description || null,
          thumbnail_url: newThumbnailUrl || null,
          tags: tagArray.length > 0 ? tagArray : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (reelError) throw reelError;
      
      addToast({
        type: 'success',
        message: 'Reel updated successfully!',
      });

      navigate(`/reels/${id}`);
    } catch (error) {
      console.error('Error updating reel:', error);
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update reel',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-dark-300 rounded w-1/4 mb-8" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-dark-300 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-dark-300 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <h1 className="text-3xl font-bold">Edit Reel</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-200 rounded-xl shadow-sm overflow-hidden"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Video preview */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center">
                <Video className="h-4 w-4 mr-1" />
                Video Preview
              </label>
              <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
                <video
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  muted
                />
              </div>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center">
                <ImageIcon className="h-4 w-4 mr-1" />
                Thumbnail (Optional)
              </label>
              <div className="aspect-[9/16] bg-gray-100 dark:bg-dark-300 rounded-lg overflow-hidden relative">
                {thumbnailPreview ? (
                  <>
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="px-4 py-2 bg-white rounded-md shadow-md text-sm font-medium"
                      >
                        Change thumbnail
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                  >
                    <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Add a thumbnail
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  ref={thumbnailInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailSelect}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a title for your reel"
              className="w-full"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your reel"
              rows={4}
              className="w-full"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Tag className="h-4 w-4 mr-1" />
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., javascript, react, tutorial"
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Add relevant tags to help others discover your reel
            </p>
          </div>

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

export default ReelEditPage;