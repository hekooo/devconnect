import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Eye, ThumbsUp } from 'lucide-react';
import supabase from '../../lib/supabase';

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalComments: number;
  totalViews: number;
  totalLikes: number;
  userGrowth: {
    date: string;
    count: number;
  }[];
  popularContent: {
    id: string;
    title: string;
    type: string;
    views: number;
    likes: number;
  }[];
}

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      // Get date range
      const now = new Date();
      let startDate = new Date();
      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      // Fetch analytics data
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: totalPosts },
        { count: totalComments },
        { data: viewsData },
        { data: likesData },
        { data: userGrowth },
        { data: popularContent },
      ] = await Promise.all([
        // Total users
        supabase
          .from('profiles')
          .select('*', { count: 'exact' }),

        // Active users in time range (using created_at instead of last_sign_in_at)
        supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .gte('created_at', startDate.toISOString()),

        // Total posts
        supabase
          .from('posts')
          .select('*', { count: 'exact' }),

        // Total comments
        supabase
          .from('comments')
          .select('*', { count: 'exact' }),

        // Views analytics
        supabase
          .from('analytics_events')
          .select('*')
          .eq('event_type', 'view')
          .gte('created_at', startDate.toISOString()),

        // Likes analytics
        supabase
          .from('analytics_events')
          .select('*')
          .eq('event_type', 'like')
          .gte('created_at', startDate.toISOString()),

        // User growth
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),

        // Popular content with correct likes count
        supabase
          .from('posts')
          .select(`
            id,
            title,
            post_type,
            view_count,
            likes:likes(count)
          `)
          .order('view_count', { ascending: false })
          .limit(5),
      ]);

      setAnalytics({
        totalUsers,
        activeUsers,
        totalPosts,
        totalComments,
        totalViews: viewsData?.length || 0,
        totalLikes: likesData?.length || 0,
        userGrowth: processUserGrowth(userGrowth || []),
        popularContent: (popularContent || []).map(content => ({
          id: content.id,
          title: content.title,
          type: content.post_type,
          views: content.view_count,
          likes: content.likes?.[0]?.count || 0
        })),
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processUserGrowth = (data: any[]) => {
    // Group users by date and count
    const grouped = data.reduce((acc: any, curr: any) => {
      const date = new Date(curr.created_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Convert to array format
    return Object.entries(grouped).map(([date, count]) => ({
      date,
      count: count as number,
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-dark-300 rounded-lg p-6 h-32" />
          ))}
        </div>
        <div className="bg-gray-100 dark:bg-dark-300 rounded-lg p-6 h-64" />
        <div className="bg-gray-100 dark:bg-dark-300 rounded-lg p-6 h-96" />
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Time range selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setTimeRange('day')}
          className={`px-3 py-1 rounded-full text-sm ${
            timeRange === 'day'
              ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
              : 'hover:bg-gray-100 dark:hover:bg-dark-300'
          }`}
        >
          24 hours
        </button>
        <button
          onClick={() => setTimeRange('week')}
          className={`px-3 py-1 rounded-full text-sm ${
            timeRange === 'week'
              ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
              : 'hover:bg-gray-100 dark:hover:bg-dark-300'
          }`}
        >
          7 days
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-3 py-1 rounded-full text-sm ${
            timeRange === 'month'
              ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
              : 'hover:bg-gray-100 dark:hover:bg-dark-300'
          }`}
        >
          30 days
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-300 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Total Users</h3>
            <Users className="h-6 w-6 text-primary-500" />
          </div>
          <div className="text-3xl font-bold">{analytics.totalUsers}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {analytics.activeUsers} active users
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-dark-300 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Total Posts</h3>
            <MessageSquare className="h-6 w-6 text-primary-500" />
          </div>
          <div className="text-3xl font-bold">{analytics.totalPosts}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {analytics.totalComments} comments
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-dark-300 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Total Views</h3>
            <Eye className="h-6 w-6 text-primary-500" />
          </div>
          <div className="text-3xl font-bold">{analytics.totalViews}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            In the last {timeRange === 'day' ? '24 hours' : timeRange === 'week' ? '7 days' : '30 days'}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-dark-300 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Total Likes</h3>
            <ThumbsUp className="h-6 w-6 text-primary-500" />
          </div>
          <div className="text-3xl font-bold">{analytics.totalLikes}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            In the last {timeRange === 'day' ? '24 hours' : timeRange === 'week' ? '7 days' : '30 days'}
          </div>
        </motion.div>
      </div>

      {/* User growth chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-dark-300 rounded-lg p-6"
      >
        <h3 className="text-lg font-medium mb-6">User Growth</h3>
        <div className="h-64">
          {/* Add chart visualization here */}
        </div>
      </motion.div>

      {/* Popular content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-dark-300 rounded-lg p-6"
      >
        <h3 className="text-lg font-medium mb-6">Popular Content</h3>
        <div className="space-y-4">
          {analytics.popularContent.map((content) => (
            <div
              key={content.id}
              className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-dark-400 last:border-0"
            >
              <div>
                <h4 className="font-medium">{content.title}</h4>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {content.type}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <Eye className="h-4 w-4" />
                  <span>{content.views}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{content.likes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyticsDashboard;