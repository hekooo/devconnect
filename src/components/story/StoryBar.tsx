import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../contexts/UserProfileContext';
import StoryUploader from './StoryUploader';
import supabase from '../../lib/supabase';

interface Story {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
    full_name?: string;
  };
  viewed: boolean;
}

const StoryBar = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [stories, setStories] = useState<Story[]>([]);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      // Get all active stories
      const { data: allStories, error } = await supabase
        .from('stories')
        .select(`
          id,
          user:profiles (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (allStories) {
        // Group stories by user
        const storiesByUser = allStories.reduce((acc, story) => {
          if (!acc[story.user.id]) {
            acc[story.user.id] = story;
          }
          return acc;
        }, {} as Record<string, any>);

        // Convert back to array
        const uniqueStories = Object.values(storiesByUser);

        // Check which stories the current user has viewed
        if (user) {
          const { data: viewedStories } = await supabase
            .from('story_views')
            .select('story_id')
            .eq('user_id', user.id);

          const viewedStoryIds = new Set(viewedStories?.map(v => v.story_id) || []);

          setStories(uniqueStories.map(story => ({
            ...story,
            viewed: viewedStoryIds.has(story.id),
          })));
        } else {
          setStories(uniqueStories.map(story => ({
            ...story,
            viewed: false,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const defaultAvatar = `https://api.dicebear.com/7.x/avatars/svg?seed=${user?.email}`;

  return (
    <div className="relative">
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Add story button */}
        <div className="flex-shrink-0 w-20">
          <button
            onClick={() => setIsUploaderOpen(true)}
            className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 dark:border-dark-400 flex items-center justify-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors bg-gray-50 dark:bg-dark-200"
          >
            <Plus className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </button>
          <p className="text-xs text-center mt-2 truncate">Add Story</p>
        </div>

        {/* Story circles */}
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-20 animate-pulse">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-dark-300"></div>
              <div className="h-3 w-16 mx-auto mt-2 bg-gray-200 dark:bg-dark-300 rounded"></div>
            </div>
          ))
        ) : (
          stories.map((story) => (
            <div key={story.id} className="flex-shrink-0 w-20">
              <Link 
                to={`/stories/${story.id}`} 
                className="block relative"
              >
                <motion.div
                  className={`w-20 h-20 rounded-full ${
                    story.viewed
                      ? 'p-1 border-2 border-gray-300 dark:border-gray-600'
                      : 'p-1 bg-gradient-to-tr from-primary-500 via-primary-300 to-secondary-500'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <img
                    src={story.user.avatar_url || defaultAvatar}
                    alt={story.user.username}
                    className="w-full h-full object-cover rounded-full border-2 border-white dark:border-dark-100"
                  />
                </motion.div>
              </Link>
              <p className="text-xs text-center mt-2 truncate">
                {story.user.username}
              </p>
            </div>
          ))
        )}
      </div>

      <StoryUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onSuccess={() => {
          setIsUploaderOpen(false);
          fetchStories();
        }}
      />
    </div>
  );
};

export default StoryBar;