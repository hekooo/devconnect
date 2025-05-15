import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Plus, Video, Clock, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import ReelUploader from '../../components/reels/ReelUploader';
import ReelViewer from '../../components/reels/ReelViewer';
import supabase from '../../lib/supabase';

interface ProfileReelsTabProps {
  userId: string;
  isOwnProfile: boolean;
}

interface Reel {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
  view_count: number;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

const ProfileReelsTab: React.FC<ProfileReelsTabProps> = ({ userId, isOwnProfile }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [hoveredReel, setHoveredReel] = useState<string | null>(null);
  const videoRefs = new Map<string, HTMLVideoElement>();

  useEffect(() => {
    fetchReels();
  }, [userId]);

  const fetchReels = async () => {
    try {
      const { data, error } = await supabase
        .from('developer_reels')
        .select(`
          id, 
          title, 
          thumbnail_url, 
          video_url, 
          view_count, 
          created_at,
          user:profiles (
            id,
            username,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReels(data || []);
    } catch (error) {
      console.error('Error fetching reels:', error);
      addToast({
        type: 'error',
        message: 'Failed to load reels',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReelSuccess = (newReel: any) => {
    setReels(prev => [newReel, ...prev]);
    setIsUploaderOpen(false);
  };

  const handleMouseEnter = (reelId: string) => {
    setHoveredReel(reelId);
    const videoElement = videoRefs.get(reelId);
    if (videoElement) {
      videoElement.currentTime = 0;
      videoElement.play().catch(err => console.error('Error playing video:', err));
    }
  };

  const handleMouseLeave = (reelId: string) => {
    setHoveredReel(null);
    const videoElement = videoRefs.get(reelId);
    if (videoElement) {
      videoElement.pause();
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div>
      {isOwnProfile && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setIsUploaderOpen(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Reel
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-[9/16] bg-gray-200 dark:bg-dark-300 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-3xl shadow-xl">
          <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No reels yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {isOwnProfile
              ? "You haven't created any reels yet."
              : "This user hasn't created any reels yet."}
          </p>
          {isOwnProfile && (
            <button
              onClick={() => setIsUploaderOpen(true)}
              className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-full shadow hover:from-indigo-600 hover:to-indigo-700 transition"
            >
              <Plus className="h-4 w-4 mr-2 inline" />
              Create your first reel
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {reels.map((reel) => (
            <motion.div
              key={reel.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-[9/16] bg-gray-100 dark:bg-dark-300 rounded-lg overflow-hidden relative group cursor-pointer"
              onClick={() => setSelectedReelId(reel.id)}
              onMouseEnter={() => handleMouseEnter(reel.id)}
              onMouseLeave={() => handleMouseLeave(reel.id)}
            >
              {reel.thumbnail_url ? (
                <img
                  src={reel.thumbnail_url}
                  alt={reel.title}
                  className={`w-full h-full object-cover ${
                    hoveredReel === reel.id ? 'opacity-0' : 'opacity-100'
                  } transition-opacity duration-300`}
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${
                  hoveredReel === reel.id ? 'opacity-0' : 'opacity-100'
                } transition-opacity duration-300`}>
                  <Play className="h-12 w-12 text-white opacity-50" />
                </div>
              )}
              
              <video
                ref={el => {
                  if (el) videoRefs.set(reel.id, el);
                }}
                src={reel.video_url}
                className={`absolute inset-0 w-full h-full object-cover ${
                  hoveredReel === reel.id ? 'opacity-100' : 'opacity-0'
                } transition-opacity duration-300`}
                muted
                playsInline
                loop
              />
              
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                <Play className="h-12 w-12 text-white mb-4" fill="white" />
                <h3 className="text-white text-center font-medium line-clamp-2">{reel.title}</h3>
                
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                  <div className="flex items-center text-white/80 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatDistanceToNow(new Date(reel.created_at), { addSuffix: true })}</span>
                  </div>
                  
                  <div className="flex items-center text-white/80 text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    <span>{formatCount(reel.view_count)} views</span>
                  </div>
                </div>
              </div>
              
              {/* Category badge */}
              <div className="absolute top-2 right-2 z-10">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300">
                  <Video className="h-3 w-3 mr-1" />
                  Reel
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reel uploader modal */}
      <ReelUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onSuccess={handleReelSuccess}
      />

      {/* Reel viewer modal */}
      {selectedReelId && (
        <ReelViewer
          reelId={selectedReelId}
          onClose={() => setSelectedReelId(null)}
          showComments={true}
          relatedReels={reels}
          onNavigateReel={(reelId) => setSelectedReelId(reelId)}
        />
      )}
    </div>
  );
};

export default ProfileReelsTab;