import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, X, BellOff, Pin, Archive, ArrowUpRight, ChevronLeft, Users, UserPlus, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';
import NewChatModal from './NewChatModal';
import ChatMenu from './ChatMenu';

interface ChatSidebarProps {
  onChatSelect?: (chatId: string) => void;
}

interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  updated_at: string;
  last_message?: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    is_deleted?: boolean;
  };
  other_member?: {
    id: string;
    username: string;
    avatar_url: string;
    full_name?: string;
    online: boolean;
  };
  members?: Array<{
    id: string;
    username: string;
    avatar_url: string;
    full_name?: string;
    online: boolean;
  }>;
  unread_count: number;
  is_pinned?: boolean;
  is_muted?: boolean;
  is_archived?: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onChatSelect }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { addToast } = useToast();

  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newModal, setNewModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'direct' | 'group'>('all');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      // First, get all chat memberships for the current user
      const { data: memberships, error: membershipError } = await supabase
        .from('chat_members')
        .select('chat_id, last_read_at')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;
      
      if (!memberships || memberships.length === 0) {
        setChats([]);
        setIsLoading(false);
        return;
      }

      const chatIds = memberships.map(m => m.chat_id);
      const lastReadMap = memberships.reduce(
        (acc, curr) => ({ ...acc, [curr.chat_id]: curr.last_read_at }),
        {} as Record<string, string>
      );

      // Get all chats the user is a member of
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('id, type, name, created_at, updated_at, creator_id')
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (chatError) throw chatError;

      // Process each chat to get additional data
      const processedChats = await Promise.all((chatData || []).map(async chat => {
        // Get the last message for this chat
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('id, content, created_at, sender_id, type, is_deleted')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get all members of this chat
        const { data: chatMembers } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', chat.id);

        const memberIds = chatMembers?.map(m => m.user_id) || [];

        // Get unread message count
        const lastRead = lastReadMap[chat.id] || new Date(0).toISOString();
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .gt('created_at', lastRead)
          .neq('sender_id', user.id);

        // For direct chats, get the other user's profile
        let otherMember = null;
        let members = null;

        if (chat.type === 'direct') {
          const otherId = memberIds.find(id => id !== user.id);
          if (otherId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, username, avatar_url, full_name')
              .eq('id', otherId)
              .single();
            
            if (profile) {
              otherMember = { 
                ...profile, 
                online: onlineUsers.has(profile.id) 
              };
            }
          }
        } else {
          // For group chats, get all member profiles
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name')
            .in('id', memberIds);
          
          if (profiles) {
            members = profiles.map(profile => ({
              ...profile,
              online: onlineUsers.has(profile.id)
            }));
          }
        }

        return {
          ...chat,
          last_message: lastMessage,
          other_member: otherMember,
          members,
          unread_count: unreadCount || 0,
          is_pinned: false, // You could store this in a user preference table
          is_muted: false,
          is_archived: false
        };
      }));

      setChats(processedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError('Failed to load chats. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, onlineUsers]);

  const fetchFollowingUsers = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      if (error) throw error;
      
      const followingIds = data?.map(item => item.following_id) || [];
      setFollowingUsers(followingIds);
    } catch (error) {
      console.error('Error fetching following users:', error);
    }
  }, [user]);

  const subscribeToPresence = useCallback(() => {
    if (!socket || !user) return;
    
    socket.on('userOnline', (id: string) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    });
    
    socket.on('userOffline', (id: string) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
    
    socket.emit('getOnlineUsers', (ids: string[]) => {
      setOnlineUsers(new Set(ids));
    });
    
    return () => {
      socket.off('userOnline');
      socket.off('userOffline');
    };
  }, [socket, user]);

  useEffect(() => {
    if (user) {
      fetchChats();
      fetchFollowingUsers();
      const unsubscribe = subscribeToPresence();
      
      // Set up realtime subscription for chat updates
      const channel = supabase
        .channel('chats_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, fetchChats)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchChats)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members' }, fetchChats)
        .subscribe();
      
      return () => {
        if (unsubscribe) unsubscribe();
        supabase.removeChannel(channel);
      };
    }
  }, [user, socket, fetchChats, subscribeToPresence, fetchFollowingUsers]);

  useEffect(() => {
    let result = [...chats];
    
    if (filter === 'unread') result = result.filter(c => c.unread_count > 0);
    if (filter === 'direct') result = result.filter(c => c.type === 'direct');
    if (filter === 'group') result = result.filter(c => c.type === 'group');
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => {
        const name =
          c.type === 'direct'
            ? c.other_member!.username + (c.other_member!.full_name || '')
            : c.name || '';
        const last = c.last_message?.content || '';
        return name.toLowerCase().includes(q) || last.toLowerCase().includes(q);
      });
    }
    
    result.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    
    setFilteredChats(result);
  }, [chats, filter, searchQuery]);

  const handleChatClick = (chatId: string) => {
    if (onChatSelect) {
      onChatSelect(chatId);
    } else {
      navigate(`/messages/${chatId}`);
    }
  };

  const getChatDisplayName = (chat: Chat) =>
    chat.type === 'direct'
      ? chat.other_member!.full_name || chat.other_member!.username
      : chat.name ||
        chat.members!.map(m => m.full_name || m.username).join(', ');

  const getLastMessagePreview = (chat: Chat) => {
    const msg = chat.last_message;
    if (!msg) return 'No messages yet';
    if (msg.is_deleted) return 'This message was deleted';
    if (msg.content.startsWith('```')) return 'Sent a code snippet';
    if (msg.content.startsWith('[IMAGE]')) return 'Sent an image';
    if (msg.content.startsWith('[FILE]')) return 'Sent a file';
    return msg.content.length > 30
      ? msg.content.slice(0, 30) + '…'
      : msg.content;
  };

  const getLastMessageIcon = (chat: Chat) => {
    const msg = chat.last_message;
    if (!msg) return null;
    if (msg.content.startsWith('```'))
      return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 text-purple-500"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>;
    if (msg.content.startsWith('[IMAGE]'))
      return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 text-blue-500"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>;
    if (msg.content.startsWith('[FILE]'))
      return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 text-green-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>;
    return null;
  };

  const showEmptyState =
    !isLoading && filteredChats.length === 0 && !searchQuery;
  const showNoResults =
    !isLoading && searchQuery && filteredChats.length === 0 && chats.length > 0;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-100">
      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-dark-300">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Messages
        </h2>
        <button
          onClick={() => setNewModal(true)}
          className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition"
          aria-label="New chat"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {/* Search & Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-300">
        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search chats…"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-dark-300 rounded-full
                       focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {(['all', 'unread', 'direct', 'group'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition
                ${filter === f
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'
                  : 'bg-gray-100 dark:bg-dark-300 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Connection Status */}
      {socket && (
        <div
          className={`px-4 py-1 md:py-2 text-xs
            ${isConnected
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
            }`}
        >
          {isConnected ? 'Connected to chat server' : 'Connecting…'}
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-dark-300 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-dark-300 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <BellOff className="h-12 w-12 text-error-500" />
            <p className="text-gray-500">{error}</p>
            <button
              onClick={() => fetchChats()}
              className="px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        ) : showEmptyState ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <Users className="h-16 w-16 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-500">No chats yet</h3>
            <button
              onClick={() => setNewModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> New Chat
            </button>
          </div>
        ) : showNoResults ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <Search className="h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-500">No results found</h3>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-dark-300">
            {filteredChats.map((chat) => (
              <motion.li
                key={chat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onContextMenu={e => {
                  e.preventDefault();
                  setSelectedChat(chat.id);
                  setShowMenu(true);
                }}
              >
                <button
                  onClick={() => handleChatClick(chat.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-dark-200 text-left"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {chat.type === 'direct' ? (
                      <>
                        <img
                          src={chat.other_member?.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${chat.other_member?.username || 'user'}`}
                          alt={chat.other_member?.username || 'User'}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-dark-100
                            ${chat.other_member?.online ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                      </>
                    ) : (
                      <div className="flex -space-x-2">
                        {chat.members?.slice(0, 3).map((m, i) => (
                          <img
                            key={m.id}
                            src={m.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${m.username}`}
                            alt={m.username}
                            className={`w-8 h-8 rounded-full border-2 border-white dark:border-dark-100 ${
                              i === 0 ? 'z-10' : ''
                            }`}
                          />
                        ))}
                        {chat.members && chat.members.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-dark-300 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 border-2 border-white dark:border-dark-100">
                            +{chat.members.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    {chat.is_pinned && (
                      <Pin className="absolute -top-1 -left-1 h-4 w-4 text-primary-500" />
                    )}
                    {chat.is_muted && (
                      <BellOff className="absolute -top-1 -right-1 h-4 w-4 text-gray-500" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {getChatDisplayName(chat)}
                      </h3>
                      {chat.last_message && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                          {new Date(chat.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center">
                        {chat.last_message && (
                          <>
                            {chat.last_message.sender_id === user?.id && (
                              <span className="mr-1 text-gray-600 dark:text-gray-300">
                                You:
                              </span>
                            )}
                            {getLastMessageIcon(chat)}
                            {getLastMessagePreview(chat)}
                          </>
                        )}
                      </p>
                      {chat.unread_count > 0 && (
                        <span className="bg-primary-600 text-white text-xs font-medium px-2 py-0.5 rounded-full ml-2">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={newModal}
        onClose={() => setNewModal(false)}
        onChatCreated={cid => {
          setNewModal(false);
          handleChatClick(cid);
          fetchChats();
        }}
        followingUsers={followingUsers}
      />

      {/* Context Menu */}
      <AnimatePresence>
        {showMenu && selectedChat && (
          <ChatMenu
            chat={chats.find(c => c.id === selectedChat)!}
            onClose={() => setShowMenu(false)}
            onDelete={() => {
              setChats(prev => prev.filter(c => c.id !== selectedChat));
              setShowMenu(false);
            }}
            onPin={() => {
              setChats(prev =>
                prev.map(c =>
                  c.id === selectedChat ? { ...c, is_pinned: !c.is_pinned } : c
                )
              );
              setShowMenu(false);
            }}
            onMute={() => {
              setChats(prev =>
                prev.map(c =>
                  c.id === selectedChat ? { ...c, is_muted: !c.is_muted } : c
                )
              );
              setShowMenu(false);
            }}
            onArchive={() => {
              setChats(prev =>
                prev.map(c =>
                  c.id === selectedChat ? { ...c, is_archived: !c.is_archived } : c
                )
              );
              setShowMenu(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatSidebar;