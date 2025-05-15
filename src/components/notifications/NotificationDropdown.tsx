import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Check, Bell, MessageSquare, Heart, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotifications } from '../../contexts/NotificationContext';

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { notifications, markAsRead } = useNotifications();

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

  const getNotificationLink = (notification: any) => {
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
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 5).map((notification) => (
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
                  src={notification.actor?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"}
                  alt={notification.actor?.username}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{notification.actor?.full_name || notification.actor?.username}</span>{' '}
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