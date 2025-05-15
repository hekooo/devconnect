import { useState, useRef } from 'react';
import { X, Video, Image as ImageIcon, Tag, Share2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface Reel {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  tags: string[] | null;
}

interface ReelUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  /** onSuccess’e yeni reel’i iletip parent’ı güncelleyebilirsiniz */
  onSuccess?: (reel: Reel) => void;
}

const ReelUploader: React.FC<ReelUploaderProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const [isUploaded, setIsUploaded] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setTitle('');
    setDescription('');
    setTags('');
    setVideoFile(null);
    setThumbnailFile(null);
    setVideoPreview(null);
    setThumbnailPreview(null);
    setIsUploading(false);
    setUploadProgress(0);
    setIsUploaded(false);
    setShareUrl('');
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/') || file.size > 100*1024*1024) {
      addToast({ type:'error', message: 'Lütfen geçerli (max 100MB) bir video seçin.' });
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast({ type:'error', message: 'Lütfen geçerli bir resim seçin.' });
      return;
    }
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!user || !videoFile) {
      addToast({ type:'error', message:'Önce bir video seçin.' });
      return;
    }
    if (!title.trim()) {
      addToast({ type:'error', message:'Bir başlık girin.' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1) Video yükle
      const ext = videoFile.name.split('.').pop();
      const vidName = `${uuidv4()}.${ext}`;
      const vidPath = `${user.id}/${vidName}`;
      await supabase
        .storage
        .from('reels')
        .upload(vidPath, videoFile, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: ({ loaded, total }) =>
            setUploadProgress((loaded/total)*80)
        });
      const { data: { publicUrl: videoUrl } } = supabase
        .storage
        .from('reels')
        .getPublicUrl(vidPath);

      // 2) Thumbnail yükle (opsiyonel)
      let thumbnailUrl = '';
      if (thumbnailFile) {
        const tExt = thumbnailFile.name.split('.').pop();
        const tName = `${uuidv4()}.${tExt}`;
        const tPath = `${user.id}/${tName}`;
        await supabase
          .storage
          .from('reel-thumbnails')
          .upload(tPath, thumbnailFile, { cacheControl:'3600', upsert:false });
        thumbnailUrl = supabase
          .storage
          .from('reel-thumbnails')
          .getPublicUrl(tPath).data.publicUrl;
      }

      setUploadProgress(90);

      // 3) DB kaydı
      const tagArray = tags.split(',').map(t=>t.trim()).filter(Boolean);
      const { data: reel } = await supabase
        .from('developer_reels')
        .insert({
          user_id: user.id,
          title,
          description: description||null,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl||null,
          tags: tagArray.length?tagArray:null
        })
        .select()
        .single();

      setUploadProgress(100);
      setIsUploaded(true);
      setShareUrl(`${window.location.origin}/reels/${reel.id}`);
      addToast({ type:'success', message:'Reel başarıyla yüklendi!' });

      // Parent’ı bilgilendir
      onSuccess?.(reel);
    } catch (err) {
      console.error(err);
      addToast({ type:'error', message:(err instanceof Error?err.message:'Yükleme başarısız oldu') });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title, text:description||'', url:shareUrl });
    } catch {
      navigator.clipboard.writeText(shareUrl);
      addToast({ type:'success', message:'Link kopyalandı!' });
    }
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <motion.div
          initial={{ opacity:0, scale:0.95 }}
          animate={{ opacity:1, scale:1 }}
          exit={{ opacity:0, scale:0.95 }}
          className="relative bg-white dark:bg-dark-200 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-300">
            <h2 className="text-xl font-semibold">
              {isUploaded ? 'Reel Yüklendi!' : 'Reel Yükle'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-full"
              disabled={isUploading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* PUBLISH FAB */}
          {videoFile && !isUploaded && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="absolute bottom-4 right-4 flex items-center px-4 py-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition z-10"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Share2 className="w-5 h-5 mr-2" />
                  Yayınla
                </>
              )}
            </button>
          )}

          {/* CONTENT */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
            {!videoFile ? (
              <label className="block w-full cursor-pointer">
                <input
                  type="file"
                  ref={videoInputRef}
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={handleVideoSelect}
                />
                <div className="border-2 border-dashed border-gray-300 dark:border-dark-400 rounded-lg p-12 text-center hover:border-primary-500 dark:hover:border-primary-400 transition">
                  <Video className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Video seçin</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    MP4, WebM veya MOV (max. 100MB)
                  </p>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
                  >
                    Seç
                  </button>
                </div>
              </label>
            ) : (
              <div className="space-y-6">
                {/* Önizlemeler */}
                <div className="flex gap-6">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium mb-2">Video Önizleme</label>
                    <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
                      <video
                        src={videoPreview!}
                        className="w-full h-full object-contain"
                        controls
                      />
                      <button
                        onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                      >
                        <X className="h-4 w-4"/>
                      </button>
                    </div>
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-medium mb-2">Thumbnail (Opsiyonel)</label>
                    <div className="relative aspect-[9/16] bg-gray-100 dark:bg-dark-300 rounded-lg overflow-hidden">
                      {thumbnailPreview ? (
                        <>
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }}
                            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                          >
                            <X className="h-4 w-4"/>
                          </button>
                        </>
                      ) : (
                        <div
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                        >
                          <ImageIcon className="h-12 w-12 text-gray-400 mb-2"/>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Thumbnail ekle
                          </p>
                          <input
                            type="file"
                            ref={thumbnailInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleThumbnailSelect}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Başlık */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Başlık <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e=>setTitle(e.target.value)}
                    placeholder="Reel başlığı ekleyin"
                    className="w-full"
                    required
                  />
                </div>

                {/* Açıklama */}
                <div>
                  <label className="block text-sm font-medium mb-2">Açıklama</label>
                  <textarea
                    value={description}
                    onChange={e=>setDescription(e.target.value)}
                    rows={3}
                    placeholder="Reel açıklaması"
                    className="w-full"
                  />
                </div>

                {/* Etiketler */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <Tag className="h-4 w-4 mr-1"/> Etiketler
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={e=>setTags(e.target.value)}
                    placeholder="örn: javascript, react"
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Virgülle ayırın
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Yükleme sonrası */}
          <AnimatePresence>
            {isUploaded && (
              <motion.div
                initial={{ opacity:0, y:20 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:20 }}
                className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-6 space-y-4"
              >
                <Check className="h-12 w-12 text-green-600"/>
                <h3 className="text-xl font-semibold">Reel Yüklendi!</h3>
                <div className="flex gap-4">
                  <button
                    onClick={handleShare}
                    className="btn-primary flex items-center px-4 py-2"
                  >
                    <Share2 className="h-4 w-4 mr-2"/>Paylaş
                  </button>
                  <button
                    onClick={() => window.open(shareUrl, '_blank')}
                    className="btn-outline flex items-center px-4 py-2"
                  >
                    <Video className="h-4 w-4 mr-2"/>Görüntüle
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReelUploader;
