import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Tag, ArrowUp as ArrowsMove } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface StoryUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const StoryUploader: React.FC<StoryUploaderProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [captionPosition, setCaptionPosition] = useState<{ x: number; y: number }>({ x: 10, y: 70 });
  const [isDraggingCaption, setIsDraggingCaption] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast({
          type: 'error',
          message: 'Please select an image file for your story.',
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCaptionDragStart = (e: React.MouseEvent) => {
    if (!captionRef.current || !containerRef.current) return;
    
    setIsDraggingCaption(true);
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const captionRect = captionRef.current.getBoundingClientRect();
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    const startLeft = captionRect.left - containerRect.left;
    const startTop = captionRect.top - containerRect.top;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newLeft = startLeft + (e.clientX - startX);
      const newTop = startTop + (e.clientY - startY);
      
      // Constrain to container bounds
      const maxLeft = containerRect.width - captionRect.width;
      const maxTop = containerRect.height - captionRect.height;
      
      const boundedLeft = Math.max(0, Math.min(newLeft, maxLeft));
      const boundedTop = Math.max(0, Math.min(newTop, maxTop));
      
      setCaptionPosition({
        x: boundedLeft / containerRect.width * 100, // Store as percentage
        y: boundedTop / containerRect.height * 100
      });
    };
    
    const handleMouseUp = () => {
      setIsDraggingCaption(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    try {
      // Read file content for upload
      const contentReader = new FileReader();
      const fileContentPromise = new Promise((resolve) => {
        contentReader.onloadend = () => resolve(contentReader.result);
        contentReader.readAsArrayBuffer(selectedFile);
      });

      const fileContent = await fileContentPromise;
      
      // Create a blob with the correct content type
      const blob = new Blob([fileContent as ArrayBuffer], { type: selectedFile.type });
      
      // Upload media to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, blob, {
          contentType: selectedFile.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(filePath);

      // Calculate expiry time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create story record
      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          caption: caption || null,
          caption_position: caption ? captionPosition : null,
          expires_at: expiresAt.toISOString(),
        });

      if (storyError) throw storyError;

      addToast({
        type: 'success',
        message: 'Story uploaded successfully!',
      });

      onSuccess();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload story',
      });
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      setCaptionPosition({ x: 10, y: 70 });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-dark-200 rounded-xl shadow-xl w-full max-w-lg"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-300">
            <h2 className="text-xl font-semibold">Create Story</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            {!preview ? (
              <label className="block w-full cursor-pointer">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="border-2 border-dashed border-gray-300 dark:border-dark-400 rounded-lg p-8 text-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click to upload an image for your story
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Story will be visible for 24 hours
                  </p>
                </div>
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative" ref={containerRef}>
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  
                  {caption && (
                    <div 
                      ref={captionRef}
                      className="absolute p-3 bg-black/50 text-white rounded-lg cursor-move flex items-center"
                      style={{
                        left: `${captionPosition.x}%`,
                        top: `${captionPosition.y}%`,
                        maxWidth: '80%',
                        backdropFilter: 'blur(4px)'
                      }}
                      onMouseDown={handleCaptionDragStart}
                    >
                      <ArrowsMove className="h-4 w-4 mr-2 text-white/70" />
                      {caption}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <Tag className="h-4 w-4 mr-1" /> Caption
                  </label>
                  <textarea
                    placeholder="Add a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full h-20 resize-none"
                  />
                  {caption && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <ArrowsMove className="h-3 w-3 mr-1" />
                      Drag the caption to position it on your story
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-dark-300">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md"
            >
              Cancel
            </button>
            
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="btn-primary"
            >
              {isUploading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Uploading...
                </div>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Share Story
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StoryUploader;