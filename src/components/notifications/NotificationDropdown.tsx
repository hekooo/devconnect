import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Check, Bell, MessageSquare, Heart, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import supabase from '../../lib/supabase';

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  notification_type: string;
  entity_id: string;
  entity_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor: {
    username: string;
    avatar_url: string;
    full_name?: string;
  };
}

interface NotificationDropdownProps {
  onClose: () => void;
  onNotificationRead?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose, onNotificationRead }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!actor_id (
            username,
            avatar_url,
            full_name
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      ));
      
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-error-500" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-primary-500" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-success-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationLink = (notification: Notification) => {
    switch (notification.entity_type) {
      case 'post':
        return `/posts/${notification.entity_id}`;
      case 'comment':
        return `/posts/${notification.entity_id}#comments`;
      case 'profile':
      case 'follow':
        return `/profile/${notification.actor_id}`;
      default:
        return '#';
    }
  };

  return (
    <div className="bg-white dark:bg-dark-200 rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-dark-300">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <Link
            to="/notifications"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            onClick={onClose}
          >
            View all
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-dark-300 max-h-[480px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 dark:bg-dark-300 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-dark-300 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-4 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors ${
                !notification.is_read ? 'bg-primary-50 dark:bg-primary-900/10' : ''
              }`}
            >
              <Link
                to={getNotificationLink(notification)}
                className="flex items-start gap-3"
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id);
                  }
                  onClose();
                }}
              >
                <img
                  src={notification.actor.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${notification.actor.username}`}
                  alt={notification.actor.username}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{notification.actor.full_name || notification.actor.username}</span>{' '}
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.notification_type)}
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;