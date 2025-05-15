// src/layouts/MainLayout.tsx
import React, { useState, useEffect, ReactElement, cloneElement } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Home,
  Search,
  Bell,
  MessageSquare,
  User,
  Book,
  HelpCircle,
  Users,
  Bookmark,
  Briefcase,
  Shield,
  Database,
  Sliders,
  Code,
  Moon,
  Sun,
  LogOut
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useNotifications } from '../contexts/NotificationContext';
import supabase from '../lib/supabase';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const { unreadCount } = useNotifications();

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;

    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    const fetchCounts = async () => {
      try {
        // Chat IDs
        const { data: cms, error: chatError } = await supabase
          .from('chat_members')
          .select('chat_id')
          .eq('user_id', user.id);
        if (chatError) throw new Error(chatError.message);

        const chatIds = cms?.map(c => c.chat_id) || [];
        if (chatIds.length === 0) {
          setUnreadMessages(0);
          return;
        }

        // Unread messages
        const { count: msgCount, error: msgError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('chat_id', chatIds)
          .neq('sender_id', user.id)
          .eq('is_read', false);
        if (msgError) throw new Error(msgError.message);
        setUnreadMessages(msgCount || 0);

        retryCount = 0;
      } catch (err) {
        console.error('fetchCounts error:', err);
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(fetchCounts, RETRY_DELAY);
        }
      }
    };

    fetchCounts();

    const channel = supabase
      .channel('realtime-counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `sender_id=neq.${user.id}` },
        async payload => {
          try {
            const { chat_id } = (payload.new as any);
            const { data, error } = await supabase
              .from('chat_members')
              .select('id', { head: true })
              .eq('chat_id', chat_id)
              .eq('user_id', user.id);
            if (error) throw new Error(error.message);
            if (data) fetchCounts();
          } catch (err) {
            console.error('realtime handler error:', err);
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              setTimeout(fetchCounts, RETRY_DELAY);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [user]);

  const userLinks = [
    { path: '/', icon: <Home className="h-6 w-6" />, label: 'Home' },
    { path: '/explore', icon: <Search className="h-6 w-6" />, label: 'Explore' },
    { path: '/notifications', icon: <Bell className="h-6 w-6" />, label: 'Notifications', badge: unreadCount },
    { path: '/messages', icon: <MessageSquare className="h-6 w-6" />, label: 'Messages', badge: unreadMessages },
    { path: `/profile/${user?.id}`, icon: <User className="h-6 w-6" />, label: 'Profile' },
    { path: '/bookmarks', icon: <Bookmark className="h-6 w-6" />, label: 'Bookmarks' },
    { path: '/feed', icon: <Home className="h-6 w-6" />, label: 'Feed' },
    { path: '/blogs', icon: <Book className="h-6 w-6" />, label: 'Blogs' },
    { path: '/questions', icon: <HelpCircle className="h-6 w-6" />, label: 'Q&A' },
    { path: '/jobs', icon: <Briefcase className="h-6 w-6" />, label: 'Jobs' },
    { path: '/groups', icon: <Users className="h-6 w-6" />, label: 'Groups' },
  ];

  const adminLinks = [
    { path: '/admin', icon: <Shield className="h-6 w-6" />, label: 'Admin Home' },
    { path: '/admin/users', icon: <Users className="h-6 w-6" />, label: 'User Management' },
    { path: '/admin/content', icon: <Database className="h-6 w-6" />, label: 'Content Review' },
    { path: '/admin/settings', icon: <Sliders className="h-6 w-6" />, label: 'Site Settings' },
  ];

  const links = profile?.role === 'admin' ? adminLinks : userLinks;

  const isActive = (path: string) =>
    path === '/' ? location.pathname === path : location.pathname.startsWith(path);

  const defaultAvatar = "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";

  const renderLink = (link: typeof links[0]) => (
    <Link
      key={link.path}
      to={link.path}
      className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all ${
        isActive(link.path)
          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
          : 'hover:bg-gray-100 dark:hover:bg-dark-300 text-gray-700 dark:text-gray-300'
      }`}
    >
      {link.icon}
      <span>{link.label}</span>
      {'badge' in link && link.badge! > 0 && (
        <span
          className={`ml-auto text-xs px-2 py-1 rounded-full ${
            link.label === 'Notifications' ? 'bg-error-600' : 'bg-primary-600'
          } text-white`}
        >
          {link.badge}
        </span>
      )}
    </Link>
  );

  // İlk 5 link footer'da gösterilecek
  const mobileLinks = userLinks.slice(0, 5);

  const renderMobileLink = (link: typeof mobileLinks[0]) => (
    <Link
      key={link.path}
      to={link.path}
      className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
        isActive(link.path)
          ? 'text-primary-600'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      } relative`}
    >
      {cloneElement(link.icon as ReactElement, { className: 'h-6 w-6' })}
      {/* <span className="text-xs mt-1">{link.label}</span> */}
      {link.badge! > 0 && (
        <span className="absolute top-1 right-6 text-[10px] bg-error-600 text-white rounded-full px-1">
          {link.badge}
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-dark-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 dark:border-dark-300 h-screen sticky top-0">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <Code className="h-7 w-7 text-primary-600 dark:text-primary-500" />
            <h1 className="text-xl font-bold">DevConnect</h1>
          </Link>
          <nav className="space-y-1">{links.map(renderLink)}</nav>
        </div>
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
            <button
              onClick={() => signOut()}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300 text-error-600"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <img
              src={profile?.avatar_url || defaultAvatar}
              alt={profile?.full_name || 'Profile'}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="overflow-hidden">
              <h4 className="font-medium truncate">
                {profile?.full_name || user?.email?.split('@')[0]}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {profile?.username || user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen pb-16">
        <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile footer tab bar */}
      <footer className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-dark-200 border-t border-gray-200 dark:border-dark-300 z-40">
        <nav className="flex">{mobileLinks.map(renderMobileLink)}</nav>
      </footer>
    </div>
  );
};

export default MainLayout;