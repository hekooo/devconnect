import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  MapPin,
  Link as LinkIcon,
  Github,
  Linkedin,
  Calendar,
  Users,
  Edit,
  BookOpen,
  HelpCircle,
  Video,
  Code,
  Image as ImageIcon,
  FileText,
  MessageSquare,
  Lock,
  Unlock,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import PostCard from '../components/post/PostCard';
import QuestionCard from '../components/question/QuestionCard';
import FollowButton from '../components/profile/FollowButton';
import ProfileReelsTab from './profile/ProfileReelsTab';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import supabase from '../lib/supabase';

type ProfileTab = 'posts' | 'blogs' | 'questions' | 'following' | 'followers' | 'reels';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  website: string;
  location: string;
  github_url: string;
  linkedin_url: string;
  skills: string[];
  tech_stack: string[];
  experience: {
    title: string;
    company: string;
    start_date: string;
    end_date?: string;
    description: string;
  }[];
  role: string;
  badge: string;
  rank: string;
  created_at: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  questionCount: number;
  is_private: boolean;
}

const ProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [followData, setFollowData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reelCount, setReelCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchProfile();
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeTab]);

  useEffect(() => {
    if (user && id) {
      checkFollowStatus();
    }
  }, [user, id]);

  const checkFollowStatus = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select()
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .maybeSingle();
      
      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (profileError) throw profileError;

      const { count: followerCount, error: followerError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', id);
      if (followerError) throw followerError;

      const { count: followingCount, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', id);
      if (followingError) throw followingError;

      const { count: postCount, error: postError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);
      if (postError) throw postError;

      const { count: questionCount, error: questionError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);
      if (questionError) throw questionError;

      const { count: reelsCount, error: reelsError } = await supabase
        .from('developer_reels')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);
      if (reelsError) throw reelsError;

      setReelCount(reelsCount || 0);
      setProfile({
        ...profileData,
        followerCount: followerCount || 0,
        followingCount: followingCount || 0,
        postCount: postCount || 0,
        questionCount: questionCount || 0,
      });
      setIsPrivate(profileData.is_private || false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      addToast({ type: 'error', message: 'Failed to load profile' });
    }
  };

  const fetchContent = async () => {
    if (!id) return;

    // If profile is private and user is not the owner or a follower, don't fetch content
    if (isPrivate && !isOwnProfile && !isFollowing) {
      setIsLoading(false);
      return;
    }

    try {
      let query;
      switch (activeTab) {
        case 'posts':
          query = supabase
            .from('posts')
            .select(`*, user:profiles!posts_user_id_fkey(id,username,full_name,avatar_url)`)
            .eq('user_id', id)
            .order('created_at', { ascending: false });
          break;
        case 'blogs':
          query = supabase
            .from('posts')
            .select(`*, user:profiles!posts_user_id_fkey(id,username,full_name,avatar_url)`)
            .eq('user_id', id)
            .eq('post_type', 'blog')
            .order('created_at', { ascending: false });
          break;
        case 'questions':
          query = supabase
            .from('questions')
            .select(`*, user:profiles!questions_user_id_fkey(id,username,full_name,avatar_url)`)
            .eq('user_id', id)
            .order('created_at', { ascending: false });
          break;
        case 'following':
          query = supabase
            .from('follows')
            .select('following:profiles(id, username, full_name, avatar_url)')
            .eq('follower_id', id);
          break;
        case 'followers':
          query = supabase
            .from('follows')
            .select('follower:profiles(id, username, full_name, avatar_url)')
            .eq('following_id', id);
          break;
        case 'reels':
          setIsLoading(false);
          return;
      }

      const { data, error } = await query;
      if (error) throw error;

      if (activeTab === 'following' || activeTab === 'followers') {
        const users = (data || [])
          .map((row: any) => activeTab === 'following' ? row.following : row.follower)
          .filter((u: any) => u && u.id);
        setFollowData(users);
        setPosts([]);
      } else {
        setPosts(data || []);
        setFollowData([]);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      addToast({ type: 'error', message: 'Failed to load content' });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePrivacy = async () => {
    if (!user || !profile || user.id !== profile.id) return;
    
    setIsUpdatingPrivacy(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_private: !isPrivate })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setIsPrivate(!isPrivate);
      addToast({
        type: 'success',
        message: `Profile is now ${!isPrivate ? 'private' : 'public'}`
      });
    } catch (error) {
      console.error('Error updating profile privacy:', error);
      addToast({
        type: 'error',
        message: 'Failed to update profile privacy'
      });
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const getPostTypeBadge = (postType: string) => {
    switch (postType) {
      case 'text':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
            <FileText className="h-3 w-3 mr-1" /> Text
          </span>
        );
      case 'image':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
            <ImageIcon className="h-3 w-3 mr-1" /> Image
          </span>
        );
      case 'code':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
            <Code className="h-3 w-3 mr-1" /> Code
          </span>
        );
      case 'blog':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
            <BookOpen className="h-3 w-3 mr-1" /> Blog
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="animate-pulse p-4 space-y-4">
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-md" />
        <div className="h-6 w-3/5 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-semibold">Profile not found</h2>
        <p className="text-gray-500">The profile you're looking for doesn't exist.</p>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;
  const canViewProfile = isOwnProfile || isFollowing || !isPrivate;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 pb-12">
      {/* COVER */}
      <div className="relative h-48 w-full">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt="Cover"
            className="w-full h-full object-cover rounded-b-lg"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-700 to-gray-900 rounded-b-lg" />
        )}
        <div className="absolute inset-0 bg-black/25 rounded-b-lg" />
      </div>

      <div className="max-w-xl mx-auto -mt-12 px-4 space-y-6">
        {/* HEADER */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 items-center">
          <div className="relative mx-auto sm:mx-0">
            <img
              src={profile.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${profile.username}`}
              alt={profile.full_name}
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-full ring-4 ring-white dark:ring-gray-900 object-cover"
            />
            {profile.badge && (
              <span className="absolute top-0 right-0 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                {profile.badge}
              </span>
            )}
            {isPrivate && (
              <span className="absolute bottom-0 right-0 bg-gray-800 text-white p-1 rounded-full">
                <Lock className="h-4 w-4" />
              </span>
            )}
          </div>
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-xl sm:text-2xl font-bold">{profile.full_name}</h1>
              {isPrivate && <Lock className="h-4 w-4 text-gray-500" />}
            </div>
            <p className="text-gray-500 dark:text-gray-400">@{profile.username}</p>
            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              {isOwnProfile ? (
                <>
                  <Link
                    to="/settings/profile"
                    className="inline-flex items-center px-4 py-2 bg-indigo-500 text-white rounded-full text-sm font-medium hover:bg-indigo-600 transition"
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit Profile
                  </Link>
                  <button
                    onClick={togglePrivacy}
                    disabled={isUpdatingPrivacy}
                    className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    {isUpdatingPrivacy ? (
                      <span className="flex items-center">
                        <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full mr-1"></div>
                        Updating...
                      </span>
                    ) : isPrivate ? (
                      <>
                        <Lock className="h-4 w-4 mr-1" /> Private
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-1" /> Public
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <FollowButton userId={profile.id} onFollowChange={(following) => setIsFollowing(following)} />
                  {isFollowing && (
                    <Link
                      to={`/messages/${id}`}
                      className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" /> Message
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Private profile message */}
        {!canViewProfile && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">This Account is Private</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Follow this account to see their photos and videos.
            </p>
            <FollowButton userId={profile.id} onFollowChange={(following) => {
              setIsFollowing(following);
              if (following) {
                // Refresh content after following
                fetchContent();
              }
            }} />
          </div>
        )}

        {canViewProfile && (
          <>
            {/* BIO & LINKS */}
            {profile.bio && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <p className="text-gray-700 dark:text-gray-300">{profile.bio}</p>
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-500 dark:text-gray-400">
              {profile.location && (
                <div className="flex items-center gap-2"><MapPin /> {profile.location}</div>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-indigo-500 transition">
                  <LinkIcon /> Website
                </a>
              )}
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-indigo-500 transition">
                  <Github /> GitHub
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-indigo-500 transition">
                  <Linkedin /> LinkedIn
                </a>
              )}
              <div className="flex items-center gap-2">
                <Calendar />
                Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { label: 'Posts', count: profile.postCount, icon: <FileText className="h-5 w-5 text-indigo-500" /> },
                { label: 'Questions', count: profile.questionCount, icon: <HelpCircle className="h-5 w-5 text-orange-500" /> },
                { label: 'Reels', count: reelCount, icon: <Video className="h-5 w-5 text-pink-500" /> },
                { label: 'Followers', count: profile.followerCount, icon: <Users className="h-5 w-5 text-blue-500" /> },
                { label: 'Following', count: profile.followingCount, icon: <Users className="h-5 w-5 text-green-500" /> }
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                  <div className="flex flex-col items-center">
                    {s.icon}
                    <span className="mt-1 text-lg font-semibold">{s.count}</span>
                    <span className="text-sm text-gray-500">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* TABS */}
            <div>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {(['posts', 'blogs', 'reels', 'questions', 'following', 'followers'] as ProfileTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
                      activeTab === tab
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {{ posts: <><FileText className="inline h-4 w-4 mr-1"/>Posts</>,
                       blogs: <><BookOpen className="inline h-4 w-4 mr-1"/>Blogs</>,
                       reels: <><Video className="inline h-4 w-4 mr-1"/>Reels</>,
                       questions: <><HelpCircle className="inline h-4 w-4 mr-1"/>Q&A</>,
                       following: <><Users className="inline h-4 w-4 mr-1"/>Following</>,
                       followers: <><Users className="inline h-4 w-4 mr-1"/>Followers</> }[tab]}
                    {tab === 'reels' && reelCount > 0 && (
                      <span className="ml-1 text-xs bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 px-1 rounded-full">
                        {reelCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {activeTab === 'reels' && (
                  <ProfileReelsTab userId={id!} isOwnProfile={isOwnProfile} />
                )}

                {(activeTab === 'posts' || activeTab === 'blogs') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {posts.map(post => (
                      <div key={post.id} className="relative">
                        <div className="absolute top-2 right-2 z-10">
                          {getPostTypeBadge(post.post_type)}
                        </div>
                        <PostCard post={post} />
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'questions' && (
                  <div className="grid grid-cols-1 gap-4">
                    {posts.map(q => (
                      <div key={q.id} className="relative">
                        <div className="absolute top-2 right-2 z-10">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Q&A
                          </span>
                        </div>
                        <QuestionCard question={q} preview />
                      </div>
                    ))}
                  </div>
                )}

                {(activeTab === 'following' || activeTab === 'followers') && followData.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {followData.map(u => (
                      <Link
                        key={u.id}
                        to={`/profile/${u.id}`}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-3"
                      >
                        <img
                          src={u.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${u.username}`}
                          alt={u.full_name || u.username}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div>
                          <h3 className="font-medium">{u.full_name || u.username}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">@{u.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {(
                  (['posts','blogs','questions'].includes(activeTab) && posts.length === 0) ||
                  (['following','followers'].includes(activeTab) && followData.length === 0)
                ) && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                    {activeTab === 'posts' && <>
                      <FileText className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <h3 className="text-lg font-semibold mb-1">No posts yet</h3>
                      <p className="text-gray-500">
                        {profile.id === user?.id
                          ? "You haven't shared any posts yet."
                          : `${profile.full_name} hasn't shared any posts yet.`}
                      </p>
                    </>}
                    {activeTab === 'blogs' && <>
                      <BookOpen className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <h3 className="text-lg font-semibold mb-1">No blogs yet</h3>
                      <p className="text-gray-500">
                        {profile.id === user?.id
                          ? "You haven't written any blogs yet."
                          : `${profile.full_name} hasn't written any blogs yet.`}
                      </p>
                    </>}
                    {activeTab === 'questions' && <>
                      <HelpCircle className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <h3 className="text-lg font-semibold mb-1">No questions yet</h3>
                      <p className="text-gray-500">
                        {profile.id === user?.id
                          ? "You haven't asked any questions yet."
                          : `${profile.full_name} hasn't asked any questions yet.`}
                      </p>
                    </>}
                    {activeTab === 'following' && <>
                      <Users className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <h3 className="text-lg font-semibold mb-1">Not following anyone</h3>
                      <p className="text-gray-500">
                        {profile.id === user?.id
                          ? "You aren't following anyone yet."
                          : `${profile.full_name} isn't following anyone yet.`}
                      </p>
                    </>}
                    {activeTab === 'followers' && <>
                      <Users className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <h3 className="text-lg font-semibold mb-1">No followers yet</h3>
                      <p className="text-gray-500">
                        {profile.id === user?.id
                          ? "No one is following you yet."
                          : `No one is following ${profile.full_name} yet.`}
                      </p>
                    </>}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;