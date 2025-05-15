import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Video,
  Code,
  Sparkles,
  Zap,
  Flame,
  Clock,
  X,
  ChevronLeft,
  Users,
  UserPlus,
  UserCheck,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import ReelCard from '../components/reels/ReelCard';
import ReelUploader from '../components/reels/ReelUploader';
import ReelViewer from '../components/reels/ReelViewer';
import supabase from '../lib/supabase';

type ReelFilter = 'trending' | 'latest' | 'following' | 'coding' | 'tutorials';
type DeveloperFilter = 'popular' | 'recent';
type ExploreTab = 'reels' | 'developers';

interface Reel {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  view_count: number;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
    full_name?: string;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

interface Developer {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  skills: string[] | null;
  tech_stack: string[] | null;
  follower_count: number;
  post_count: number;
  is_following?: boolean;
  is_private?: boolean;
}

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // Tabs
  const [activeTab, setActiveTab] = useState<ExploreTab>('reels');

  // Reels state
  const [reels, setReels] = useState<Reel[]>([]);
  const [isReelsLoading, setIsReelsLoading] = useState(true);
  const [activeReelFilter, setActiveReelFilter] = useState<ReelFilter>('trending');
  const [reelSearchQuery, setReelSearchQuery] = useState('');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [reelsPage, setReelsPage] = useState(0);
  const [hasMoreReels, setHasMoreReels] = useState(true);
  const [isReelSearching, setIsReelSearching] = useState(false);

  // Developers state
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [isDevelopersLoading, setIsDevelopersLoading] = useState(true);
  const [activeDeveloperFilter, setActiveDeveloperFilter] = useState<DeveloperFilter>('popular');
  const [developerSearchQuery, setDeveloperSearchQuery] = useState('');
  const [developersPage, setDevelopersPage] = useState(0);
  const [hasMoreDevelopers, setHasMoreDevelopers] = useState(true);
  const [isDeveloperSearching, setIsDeveloperSearching] = useState(false);

  // Infinite scroll refs
  const reelsContainerRef = useRef<HTMLDivElement>(null);
  const { ref: loadMoreReelsRef, inView: inViewReels } = useInView();
  const { ref: loadMoreDevelopersRef, inView: inViewDevelopers } = useInView();

  // Fetch Reels
  const fetchReels = useCallback(async (reset: boolean) => {
    if (reset) {
      setIsReelsLoading(true);
      setReelsPage(0);
    }
    try {
      let query = supabase
        .from('developer_reels')
        .select(`
          *,
          user:profiles(id,username,avatar_url,full_name),
          likes:reel_likes(count),
          comments:reel_comments(count)
        `);

      // Search filter
      if (reelSearchQuery) {
        query = query.or(`title.ilike.%${reelSearchQuery}%,description.ilike.%${reelSearchQuery}%`);
      }

      // Category filter
      switch (activeReelFilter) {
        case 'trending':
          query = query.order('view_count', { ascending: false });
          break;
        case 'latest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'following':
          if (user) {
            const { data: following } = await supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', user.id);
            if (following && following.length > 0) {
              query = query.in('user_id', following.map(f => f.following_id));
            } else {
              setReels(reset ? [] : reels);
              setHasMoreReels(false);
              setIsReelsLoading(false);
              return;
            }
            query = query.order('created_at', { ascending: false });
          }
          break;
        case 'coding':
          query = query.contains('tags', ['coding', 'code', 'programming']).order('created_at', { ascending: false });
          break;
        case 'tutorials':
          query = query.contains('tags', ['tutorial','howto','guide','learn']).order('created_at', { ascending: false });
          break;
      }

      // Pagination
      const LIMIT = 5;
      query = query.range(
        reset ? 0 : reelsPage * LIMIT,
        (reset ? 0 : reelsPage * LIMIT) + LIMIT - 1
      );

      const { data, error } = await query;
      if (error) throw error;

      const transformed = data.map(r => ({
        ...r,
        _count: {
          likes: r.likes?.[0]?.count || 0,
          comments: r.comments?.[0]?.count || 0
        }
      }));

      setReels(reset ? transformed : [...reels, ...transformed]);
      setHasMoreReels(transformed.length === LIMIT);
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', message: 'Failed to load reels' });
    } finally {
      setIsReelsLoading(false);
    }
  }, [activeReelFilter, reelSearchQuery, reelsPage, user, reels, addToast]);

  // Fetch Developers
  const fetchDevelopers = useCallback(async (reset: boolean) => {
    if (reset) {
      setIsDevelopersLoading(true);
      setDevelopersPage(0);
    }
    try {
      let query = supabase.from('profiles').select('*');

      if (developerSearchQuery) {
        query = query.or(
          `username.ilike.%${developerSearchQuery}%,` +
          `full_name.ilike.%${developerSearchQuery}%,` +
          `bio.ilike.%${developerSearchQuery}%`
        );
      }
      if (activeDeveloperFilter === 'popular') {
        query = query.order('follower_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const LIMIT = 12;
      query = query.range(
        reset ? 0 : developersPage * LIMIT,
        (reset ? 0 : developersPage * LIMIT) + LIMIT - 1
      );

      const { data, error } = await query;
      if (error) throw error;

      // Following map
      const map = new Map<string, boolean>();
      if (user) {
        const { count: followingCount, data: followingData } = await supabase
          .from('follows')
          .select('following_id', { count: 'exact' })
          .eq('follower_id', user.id);
          
        if (followingData) {
          followingData.forEach(f => map.set(f.following_id, true));
        }
      }

      const transformed = data.map(dev => ({
        ...dev,
        is_following: map.has(dev.id)
      }));

      setDevelopers(reset ? transformed : [...developers, ...transformed]);
      setHasMoreDevelopers(transformed.length === LIMIT);
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', message: 'Failed to load developers' });
    } finally {
      setIsDevelopersLoading(false);
    }
  }, [activeDeveloperFilter, developerSearchQuery, developersPage, user, developers, addToast]);

  // Effects
  useEffect(() => { if (activeTab === 'reels') fetchReels(true); }, [activeTab, activeReelFilter]);
  useEffect(() => { if (activeTab === 'developers') fetchDevelopers(true); }, [activeTab, activeDeveloperFilter]);
  useEffect(() => { if (inViewReels && !isReelsLoading && hasMoreReels && activeTab === 'reels') setReelsPage(p=>p+1); }, [inViewReels]);
  useEffect(() => { if (inViewDevelopers && !isDevelopersLoading && hasMoreDevelopers && activeTab === 'developers') setDevelopersPage(p=>p+1); }, [inViewDevelopers]);
  useEffect(() => { if (reelsPage>0 && activeTab==='reels') fetchReels(false); }, [reelsPage]);
  useEffect(() => { if (developersPage>0 && activeTab==='developers') fetchDevelopers(false); }, [developersPage]);
  useEffect(() => {
    if (reelSearchQuery) {
      setIsReelSearching(true);
      const d = setTimeout(() => fetchReels(true), 500);
      return () => clearTimeout(d);
    } else if (isReelSearching) {
      setIsReelSearching(false);
      fetchReels(true);
    }
  }, [reelSearchQuery]);
  useEffect(() => {
    if (developerSearchQuery) {
      setIsDeveloperSearching(true);
      const d = setTimeout(() => fetchDevelopers(true), 500);
      return () => clearTimeout(d);
    } else if (isDeveloperSearching) {
      setIsDeveloperSearching(false);
      fetchDevelopers(true);
    }
  }, [developerSearchQuery]);

  const handleReelView = async (id: string) => {
    try { await supabase.rpc('increment_reel_view_count', { reel_id: id }); }
    catch { /**/ }
  };
  const handleReelClick = (i: number) => {
    setActiveReelIndex(i);
    setSelectedReelId(reels[i].id);
  };
  const handleCloseViewer = () => setSelectedReelId(null);
  const handleScroll = (dir: 'up'|'down') => {
    const c = reelsContainerRef.current;
    if (!c) return;
    const amt = c.clientHeight;
    const target = dir==='up'
      ? Math.max(0, activeReelIndex-1)
      : Math.min(reels.length-1, activeReelIndex+1);
    setActiveReelIndex(target);
    c.scrollTo({ top: amt*target, behavior: 'smooth' });
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key==='ArrowUp') handleScroll('up');
    if (e.key==='ArrowDown') handleScroll('down');
  };
  const handleFollowUser = async (id: string, isFollowing?: boolean) => {
    if (!user) { addToast({ type:'info', message:'Please login'}); return; }
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().match({ follower_id:user.id, following_id:id });
      } else {
        await supabase.from('follows').insert({ follower_id:user.id, following_id:id });
      }
      setDevelopers(devs =>
        devs.map(d => d.id===id ? { ...d, is_following:!isFollowing } : d)
      );
      addToast({ type:'success', message: isFollowing?'Unfollowed':'Following' });
    } catch { addToast({ type:'error', message:'Failed to update follow status' }); }
  };

  const handleDeveloperCardClick = (developerId: string) => {
    navigate(`/profile/${developerId}`);
  };

  return (
    <div
      className="h-[calc(100vh-64px)] flex flex-col"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-300">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Explore</h1>
          <button
            onClick={() => setIsUploaderOpen(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Reel
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-dark-300">
          <button
            onClick={() => setActiveTab('reels')}
            className={`px-4 py-2 text-sm font-medium relative ${
              activeTab === 'reels'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Video className="h-4 w-4 inline mr-1" /> Reels
            {activeTab === 'reels' && (
              <motion.div
                layoutId="tabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('developers')}
            className={`px-4 py-2 text-sm font-medium relative ${
              activeTab === 'developers'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Users className="h-4 w-4 inline mr-1" /> Developers
            {activeTab === 'developers' && (
              <motion.div
                layoutId="tabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
              />
            )}
          </button>
        </div>

        {/* Reels search & filters (mobile-first grid) */}
        {activeTab === 'reels' && (
          <div className="grid grid-cols-1 gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search reels..."
                value={reelSearchQuery}
                onChange={e => setReelSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-full border"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              {reelSearchQuery && (
                <button
                  onClick={() => setReelSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Filters */}
            <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-2">
              <Filter className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <button
                onClick={() => setActiveReelFilter('trending')}
                className={`px-3 py-1 rounded-full text-sm text-left w-full sm:w-auto ${
                  activeReelFilter === 'trending'
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <Flame className="h-4 w-4 inline mr-1" /> Trending
              </button>
              <button
                onClick={() => setActiveReelFilter('latest')}
                className={`px-3 py-1 rounded-full text-sm text-left w-full sm:w-auto ${
                  activeReelFilter === 'latest'
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-1" /> Latest
              </button>
              <button
                onClick={() => setActiveReelFilter('following')}
                className={`px-3 py-1 rounded-full text-sm text-left w-full sm:w-auto ${
                  activeReelFilter === 'following'
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <Sparkles className="h-4 w-4 inline mr-1" /> Following
              </button>
              <button
                onClick={() => setActiveReelFilter('coding')}
                className={`px-3 py-1 rounded-full text-sm text-left w-full sm:w-auto ${
                  activeReelFilter === 'coding'
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <Code className="h-4 w-4 inline mr-1" /> Coding
              </button>
              <button
                onClick={() => setActiveReelFilter('tutorials')}
                className={`px-3 py-1 rounded-full text-sm text-left w-full sm:w-auto ${
                  activeReelFilter === 'tutorials'
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <Zap className="h-4 w-4 inline mr-1" /> Tutorials
              </button>
            </div>
          </div>
        )}

        {/* Developers search & filters */}
        {activeTab === 'developers' && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search developers..."
                value={developerSearchQuery}
                onChange={e => setDeveloperSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-full border"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              {developerSearchQuery && (
                <button
                  onClick={() => setDeveloperSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <button
                onClick={() => setActiveDeveloperFilter('popular')}
                className={`px-3 py-1 rounded-full text-sm ${
                  activeDeveloperFilter === 'popular'
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <Flame className="h-4 w-4 inline mr-1" /> Popular
              </button>
              <button
                onClick={() => setActiveDeveloperFilter('recent')}
                className={`px-3 py-1 rounded-full text-sm ${
                  activeDeveloperFilter === 'recent'
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-1" /> Recent
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'reels' ? (
          <div className="h-full">
            {isReelsLoading && reels.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : reels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Video className="h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No reels found</h2>
                <p className="text-gray-500 mb-6 max-w-md">
                  {reelSearchQuery
                    ? `No reels match "${reelSearchQuery}"`
                    : activeReelFilter === 'following'
                    ? "You're not following anyone or no reels yet"
                    : "No reels in this category yet"}
                </p>
                <button
                  onClick={() => setIsUploaderOpen(true)}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" /> Create the first reel
                </button>
              </div>
            ) : (
              <div
                ref={reelsContainerRef}
                className="h-full snap-y snap-mandatory overflow-y-auto hide-scrollbar"
              >
                {reels.map((reel, idx) => (
                  <div
                    key={reel.id}
                    className="h-full w-full snap-start snap-always"
                    onClick={() => handleReelClick(idx)}
                  >
                    <ReelCard
                      reel={reel}
                      onView={handleReelView}
                      isActive={idx === activeReelIndex}
                      autoplay={idx === activeReelIndex}
                    />
                  </div>
                ))}
                {!isReelsLoading && hasMoreReels && (
                  <div ref={loadMoreReelsRef} className="h-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                )}
              </div>
            )}
            {reels.length > 0 && (
              <>
                {activeReelIndex > 0 && (
                  <button
                    onClick={() => handleScroll('up')}
                    className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/30 p-2 rounded-full text-white hover:bg-black/50 transition z-10"
                  >
                    <ChevronLeft className="h-6 w-6 rotate-90" />
                  </button>
                )}
                {activeReelIndex < reels.length - 1 && (
                  <button
                    onClick={() => handleScroll('down')}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/30 p-2 rounded-full text-white hover:bg-black/50 transition z-10"
                  >
                    <ChevronLeft className="h-6 w-6 -rotate-90" />
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            {isDevelopersLoading && developers.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-dark-200 rounded-xl p-6 animate-pulse">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gray-200 dark:bg-dark-300 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-dark-300 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-full mb-3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-5/6"></div>
                  </div>
                ))}
              </div>
            ) : developers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Users className="h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No developers found</h2>
                <p className="text-gray-500 max-w-md">
                  {developerSearchQuery
                    ? `No developers match "${developerSearchQuery}"`
                    : "No developers in this category yet"}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {developers.map((dev, idx) => (
                    <motion.div
                      key={dev.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white dark:bg-dark-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
                      onClick={() => handleDeveloperCardClick(dev.id)}
                    >
                      <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative">
                            <img
                              src={dev.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${dev.username}`}
                              alt={dev.username}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                            {dev.is_private && (
                              <span className="absolute bottom-0 right-0 bg-gray-800 text-white p-1 rounded-full">
                                <Lock className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{dev.full_name || dev.username}</h3>
                            <p className="text-gray-500 dark:text-gray-400">@{dev.username}</p>
                          </div>
                        </div>
                        
                        {dev.bio && (
                          <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{dev.bio}</p>
                        )}
                        
                        {dev.tech_stack && dev.tech_stack.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {dev.tech_stack.slice(0, 3).map((tech, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-dark-300 rounded-full text-xs">
                                {tech}
                              </span>
                            ))}
                            {dev.tech_stack.length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-300 rounded-full text-xs">
                                +{dev.tech_stack.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{dev.follower_count}</span> followers
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              handleFollowUser(dev.id, dev.is_following);
                            }}
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              dev.is_following
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                : 'bg-primary-600 text-white'
                            }`}
                          >
                            {dev.is_following ? (
                              <>
                                <UserCheck className="h-3 w-3" /> Following
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3 w-3" /> Follow
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {!isDevelopersLoading && hasMoreDevelopers && (
                  <div ref={loadMoreDevelopersRef} className="h-20 flex items-center justify-center mt-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                )}
                {isDevelopersLoading && developersPage > 0 && (
                  <div className="h-20 flex items-center justify-center mt-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ReelUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onSuccess={() => fetchReels(true)}
      />
      <AnimatePresence>
        {selectedReelId && (
          <ReelViewer
            reelId={selectedReelId}
            onClose={handleCloseViewer}
            showComments={false}
            relatedReels={reels}
            onNavigateReel={(id) => {
              const idx = reels.findIndex(r => r.id === id);
              if (idx !== -1) {
                setActiveReelIndex(idx);
                setSelectedReelId(id);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExplorePage;