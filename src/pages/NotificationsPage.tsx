import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  MessageSquare,
  Heart,
  UserPlus,
  Check,
  Trash2,
  MoreHorizontal,
  Search,
  X,
  AlertCircle,
  Mail,
  BellOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useEmailNotifications } from '../hooks/useEmailNotifications';
import { useNotifications } from '../contexts/NotificationContext';
import supabase from '../lib/supabase';

interface FollowButtonProps {
  actorId: string;
}

const FollowButton: React.FC<FollowButtonProps> = ({ actorId }) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('follows')
        .select()
        .eq('follower_id', user.id)
        .eq('following_id', actorId)
        .maybeSingle();
      if (!error) setIsFollowing(!!data);
    })();
  }, [actorId, user]);

  const toggleFollow = async () => {
    if (!user) return;
    setLoading(true);
    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', actorId);
      setIsFollowing(false);
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: actorId });
      setIsFollowing(true);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`
        px-3 py-1.5 text-sm font-medium rounded-full transition
        ${isFollowing
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
          : 'bg-primary-500 text-white hover:bg-primary-600'
        }
        disabled:opacity-50
      `}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
};

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { emailEnabled, toggleEmailNotifications } = useEmailNotifications();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    refreshNotifications 
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showActions, setShowActions] = useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [filteredNotifications, setFilteredNotifications] = useState(notifications);

  // Filter notifications based on search query and filter
  useEffect(() => {
    let filtered = [...notifications];
    
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.message.toLowerCase().includes(query) || 
        n.actor?.username.toLowerCase().includes(query) ||
        n.actor?.full_name?.toLowerCase().includes(query)
      );
    }
    
    setFilteredNotifications(filtered);
  }, [notifications, filter, searchQuery]);

  // Handle clicks outside the actions menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refresh notifications when the page loads
  useEffect(() => {
    refreshNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    setIsMarkingAllRead(true);
    await markAllAsRead();
    setIsMarkingAllRead(false);
    addToast({ type: 'success', message: 'All notifications marked as read.' });
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      refreshNotifications();
      addToast({ type: 'success', message: 'Notification deleted.' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      addToast({ type: 'error', message: 'Failed to delete notification.' });
    }
  };

  const deleteSelectedNotifications = async () => {
    const ids = Array.from(selectedNotifications);
    setIsDeleting(true);
    try {
      await supabase.from('notifications').delete().in('id', ids);
      refreshNotifications();
      setSelectedNotifications(new Set());
      addToast({ type: 'success', message: `${ids.length} notification(s) deleted.` });
    } catch (error) {
      console.error('Error deleting notifications:', error);
      addToast({ type: 'error', message: 'Failed to delete notifications.' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedNotifications(s => {
      const nxt = new Set(s);
      s.has(id) ? nxt.delete(id) : nxt.add(id);
      return nxt;
    });

  const selectAll = () => {
    setSelectedNotifications(prev =>
      prev.size === filteredNotifications.length
        ? new Set()
        : new Set(filteredNotifications.map(n => n.id))
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-error-500" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-primary-500" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-success-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
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
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
        <div className="flex items-center gap-2">
          {selectedNotifications.size > 0 ? (
            <>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {selectedNotifications.size} selected
              </span>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-error-100 dark:bg-error-200 text-error-600 rounded-full text-sm font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button
                onClick={() => setSelectedNotifications(new Set())}
                className="p-1 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead || unreadCount === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-100 dark:bg-primary-200 text-primary-600 rounded-full text-sm font-medium disabled:opacity-50"
            >
              {isMarkingAllRead ? (
                <div className="h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Email Notifications Toggle */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary-500" />
            <div>
              <h3 className="font-medium">Email Notifications</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive notifications via email
              </p>
            </div>
          </div>
          <button
            onClick={toggleEmailNotifications}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              emailEnabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                emailEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4 text-gray-500 dark:text-gray-300" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex rounded-full bg-gray-100 dark:bg-gray-700 p-1">
            <button
              onClick={() => setFilter('all')}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition
                ${filter === 'all'
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition
                ${filter === 'unread'
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
            >
              Unread
            </button>
          </div>
          <button
            onClick={selectAll}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            {selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0
              ? 'Deselect all'
              : 'Select all'}
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No notifications</h2>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'all'
                ? searchQuery 
                  ? `No notifications match "${searchQuery}"`
                  : 'You don\'t have any notifications yet.'
                : 'You don\'t have any unread notifications.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification, idx) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`
                group bg-white dark:bg-gray-800 rounded-xl shadow-sm
                ${!notification.is_read ? 'border-l-4 border-primary-500 dark:border-primary-500' : ''}
              `}
            >
              <div className="p-4 flex items-start gap-3 relative">
                <input
                  type="checkbox"
                  checked={selectedNotifications.has(notification.id)}
                  onChange={() => toggleSelect(notification.id)}
                  className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />

                <img
                  src={
                    notification.actor?.avatar_url ||
                    `https://api.dicebear.com/7.x/avatars/svg?seed=${notification.actor?.username}`
                  }
                  alt={notification.actor?.username}
                  className="w-10 h-10 rounded-full object-cover"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Link
                        to={getNotificationLink(notification)}
                        className="text-gray-900 dark:text-gray-100 hover:underline"
                        onClick={() => {
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                        }}
                      >
                        <span className="font-medium">{notification.actor?.full_name || notification.actor?.username}</span>{' '}
                        {notification.message}
                      </Link>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {notification.notification_type === 'follow' && (
                      <div className="ml-4">
                        <FollowButton actorId={notification.actor_id} />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div>{getIcon(notification.notification_type)}</div>
                      <div className="relative" ref={showActions === notification.id ? actionsRef : undefined}>
                        <button
                          onClick={() => setShowActions(showActions === notification.id ? null : notification.id)}
                          className="p-1 rounded-full opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {showActions === notification.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden z-10"
                            >
                              {!notification.is_read && (
                                <button
                                  onClick={() => {
                                    markAsRead(notification.id);
                                    setShowActions(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Check className="h-4 w-4 text-gray-700 dark:text-gray-200" />
                                  Mark as read
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  deleteNotification(notification.id);
                                  setShowActions(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Delete Notifications
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to delete {selectedNotifications.size} notification(s)? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSelectedNotifications}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm text-white bg-error-600 rounded-md disabled:opacity-50 hover:bg-error-700 transition"
                >
                  {isDeleting ? (
                    <span className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Deleting...
                    </span>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsPage;