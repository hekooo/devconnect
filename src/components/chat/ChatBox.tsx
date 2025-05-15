import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Info,
  Paperclip,
  Download,
  Image as ImageIcon,
  Code,
  Smile,
  ChevronDown,
  Maximize2,
  Minimize2,
  Users,
  Clock as ClockIcon,
  X as XIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import CodeSnippetMessage from './CodeSnippetMessage';
import ImageMessage from './ImageMessage';
import FileMessage from './FileMessage';
import TypingIndicator from './TypingIndicator';
import supabase from '../../lib/supabase';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    avatar_url: string;
    full_name?: string;
  };
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type?: 'text' | 'code' | 'image' | 'file';
  language?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_deleted?: boolean;
}

interface ChatBoxProps {
  chatId: string;
  onClose?: () => void;
  isMobile?: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ chatId, onClose, isMobile = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnreadBanner, setShowUnreadBanner] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const menuRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) return;
    fetchMessages();
    fetchChatInfo();
    markAsRead();
  }, [chatId]);

  useEffect(() => {
    if (!socket || !chatId) return;
    socket.emit('joinChat', chatId);

    socket.on('typing', ({ chatId: c, userId, username }) => {
      if (c !== chatId || userId === user?.id) return;
      setIsTyping(true);
      setTypingUser(username);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTypingUser(null);
      }, 3000);
    });

    socket.on('newMessage', (msg: any) => {
      if (msg.chat_id !== chatId) return;
      if (!messages.some(m => m.id === msg.id)) {
        const newMsg: Message = {
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          sender: msg.sender,
          status: 'delivered',
          type: msg.type || 'text',
          language: msg.language,
          file_url: msg.file_url,
          file_name: msg.file_name,
          file_size: msg.file_size,
          is_deleted: msg.is_deleted
        };
        setMessages(prev => [...prev, newMsg]);
        if (msg.sender.id !== user?.id && !isScrolledToBottom) {
          setUnreadCount(prev => prev + 1);
          setShowUnreadBanner(true);
        } else if (msg.sender.id !== user?.id) {
          markAsRead();
        }
      }
    });

    socket.on('messageStatus', ({ messageId, status }: any) => {
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, status } : m))
      );
    });

    socket.on('messageRecalled', ({ messageId }: any) => {
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, is_deleted: true } : m))
      );
    });

    return () => {
      socket.off('typing');
      socket.off('newMessage');
      socket.off('messageStatus');
      socket.off('messageRecalled');
      socket.emit('leaveChat', chatId);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, chatId, user?.id, messages, isScrolledToBottom]);

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`messages:chatId=${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async payload => {
          const msg = payload.new as any;
          if (messages.some(m => m.id === msg.id)) return;
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name')
            .eq('id', msg.sender_id)
            .single();
          const newMsg: Message = {
            id: msg.id,
            content: msg.content,
            created_at: msg.created_at,
            sender: sender || { id: msg.sender_id, username: 'Unknown', avatar_url: '' },
            status: 'delivered',
            type: msg.type || 'text',
            language: msg.language,
            file_url: msg.file_url,
            file_name: msg.file_name,
            file_size: msg.file_size,
            is_deleted: msg.is_deleted
          };
          setMessages(prev => [...prev, newMsg]);
          if (msg.sender_id !== user?.id && !isScrolledToBottom) {
            setUnreadCount(prev => prev + 1);
            setShowUnreadBanner(true);
          } else if (msg.sender_id !== user?.id) {
            markAsRead();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        payload => {
          const msg = payload.new as any;
          setMessages(prev =>
            prev.map(m =>
              m.id === msg.id
                ? { ...m, is_deleted: msg.is_deleted, content: msg.content }
                : m
            )
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, messages, isScrolledToBottom, user?.id]);

  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(
          `id, content, created_at, type, language, file_url, file_name, file_size, is_deleted,
           sender:profiles!sender_id (id, username, avatar_url, full_name)`
        )
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (fetchError) throw fetchError;
      const msgs: Message[] = data!.map(m => ({
        ...m,
        status: m.sender.id === user?.id ? 'read' : undefined
      }));
      setMessages(msgs);
    } catch (err: any) {
      setError('Failed to load messages.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatInfo = async () => {
    try {
      const { data: membership, error: membershipErr } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('chat_id', chatId)
        .eq('user_id', user!.id)
        .single();

      if (membershipErr || !membership) {
        throw new Error('Chat not found or access denied');
      }

      const { data: chat, error: chatErr } = await supabase
        .from('chats')
        .select(`
          id, type, name, created_at, creator_id,
          creator:profiles!creator_id (
            id, username, avatar_url, full_name
          )
        `)
        .eq('id', chatId)
        .maybeSingle();

      if (chatErr) throw chatErr;
      
      if (!chat) {
        throw new Error('Chat not found');
      }

      const { data: members, error: memErr } = await supabase
        .from('chat_members')
        .select('user:profiles!user_id (id, username, avatar_url, full_name)')
        .eq('chat_id', chatId);

      if (memErr) throw memErr;

      setChatInfo({ ...chat, members: members!.map(m => m.user) });
    } catch (e: any) {
      console.error('Error fetching chat:', e);
      setError(e.message || 'Failed to load chat information');
      if (e.message === 'Chat not found or access denied') {
        navigate('/messages');
      }
    }
  };

  const markAsRead = async () => {
    try {
      await supabase
        .from('chat_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', user!.id);
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', user!.id)
        .eq('is_read', false);
      setUnreadCount(0);
      setShowUnreadBanner(false);
      socket?.emit('messageRead', { chatId });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const dist = scrollHeight - (scrollTop + clientHeight);
      setShowScrollButton(dist > 200);
      setIsScrolledToBottom(dist < 20);
      if (dist < 20) {
        markAsRead();
        setShowUnreadBanner(false);
      }
    };
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, [markAsRead]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      messagesEndRef.current?.scrollIntoView({ behavior });
      setShowScrollButton(false);
      setIsScrolledToBottom(true);
      markAsRead();
    },
    [markAsRead]
  );

  const handleSendMessage = async (
    text: string,
    type: 'text' | 'code' | 'image' | 'file' = 'text',
    options?: any
  ) => {
    if (!text.trim()) return;
    const tempId = `tmp-${Date.now()}`;
    const base: Message = {
      id: tempId,
      content: text.trim(),
      created_at: new Date().toISOString(),
      sender: {
        id: user!.id,
        username: user!.email!.split('@')[0],
        avatar_url: user!.user_metadata?.avatar_url || '',
        full_name: user!.user_metadata?.full_name
      },
      status: 'sending',
      type
    };
    if (type === 'code') base.language = options.language;
    if (type === 'image' || type === 'file') {
      base.file_url = options.file_url;
      base.file_name = options.file_name;
      if (type === 'file') base.file_size = options.file_size;
    }
    setMessages(prev => [...prev, base]);
    setIsSending(true);
    try {
      const md: any = {
        chat_id: chatId,
        sender_id: user!.id,
        content: base.content,
        type
      };
      if (type === 'code') md.language = options.language;
      if (type === 'image' || type === 'file') {
        md.file_url = options.file_url;
        md.file_name = options.file_name;
        if (type === 'file') md.file_size = options.file_size;
      }
      const { data: nm, error } = await supabase
        .from('messages')
        .insert(md)
        .select(
          `id, content, created_at, type, language, file_url, file_name, file_size, is_deleted,
           sender:profiles!sender_id (id, username, avatar_url, full_name)`
        )
        .single();
      if (error) throw error;
      socket?.emit('sendMessage', { ...nm, chat_id: chatId });
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...nm, status: 'sent' } : m))
      );
      scrollToBottom();
    } catch (e) {
      console.error(e);
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user!.id);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setShowMessageMenu(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecallMessage = async (messageId: string) => {
    setIsSending(true);
    try {
      await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('sender_id', user!.id);
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, is_deleted: true } : m
        )
      );
      socket?.emit('recallMessage', { chatId, messageId, userId: user!.id });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
      setShowMessageMenu(null);
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    setMessages(prev => prev.filter(m => m.id !== messageId));
    await handleSendMessage(
      msg.content,
      msg.type || 'text',
      {
        language: msg.language,
        file_url: msg.file_url,
        file_name: msg.file_name,
        file_size: msg.file_size
      }
    );
  };

  const handleTyping = () => {
    socket?.emit('typing', {
      chatId,
      userId: user!.id,
      username: user!.user_metadata?.full_name || user!.email!.split('@')[0]
    });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      chatBoxRef.current?.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const getOtherUser = () => {
    if (!chatInfo || chatInfo.type !== 'direct') return null;
    return chatInfo.members.find((m: any) => m.id !== user!.id);
  };

  const getChatTitle = () => {
    if (!chatInfo) return 'Chat';
    if (chatInfo.type === 'direct') {
      const o = getOtherUser();
      return o?.full_name || o?.username || 'Chat';
    }
    return chatInfo.name || 'Group';
  };

  const getStatusText = () => {
    if (!chatInfo) return '';
    if (chatInfo.type === 'direct') {
      const o = getOtherUser();
      const online = (socket as any).onlineUsers?.includes(o?.id);
      return online ? 'Online' : 'Offline';
    }
    return `${chatInfo.members.length} members`;
  };

  return (
    <div
      ref={chatBoxRef}
      className="grid grid-rows-[auto,1fr,auto] grid-cols-1 md:grid-cols-[1fr,300px] h-full bg-white dark:bg-dark-100 rounded-xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <header className="row-start-1 col-span-full p-4 border-b border-gray-200 dark:border-dark-300 grid grid-cols-[auto,1fr,auto] items-center gap-2">
        <div className="flex items-center gap-2">
          {(onClose || isMobile) && (
            <button
              onClick={onClose || (() => navigate('/messages'))}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {chatInfo?.type === 'direct' ? (
              <div className="relative">
                <img
                  src={getOtherUser()?.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${getOtherUser()?.username || 'user'}`}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span
                  className={`absolute bottom-0 right-0 block w-2 h-2 rounded-full border border-white dark:border-dark-200 ${
                    getStatusText() === 'Online' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <span className="font-medium">{getChatTitle()}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-1">
          {isTyping && typingUser && (
            <TypingIndicator username={typingUser} />
          )}
          {!isMobile && (
            <>
              <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300">
                <Phone className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300">
                <Video className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </>
          )}
          <button onClick={() => setShowInfo(f => !f)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300">
            <Info className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
          <button onClick={toggleFullscreen} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300">
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="row-start-2 col-span-full overflow-y-auto p-3 space-y-3 bg-gray-50 dark:bg-dark-100"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="text-center space-y-2">
            <p className="text-error-500">{error}</p>
            <button onClick={fetchMessages} className="px-4 py-2 bg-primary-600 text-white rounded-full">
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 space-y-2">
            <Smile className="h-8 w-8 mx-auto text-gray-300" />
            <p>No messages yet</p>
          </div>
        ) : (
          <>
            {/* First date separator */}
            <div className="flex justify-center my-2">
              <span className="px-3 py-1 bg-gray-200 dark:bg-dark-300 rounded-full text-xs text-gray-600 dark:text-gray-400">
                {new Date(messages[0].created_at).toLocaleDateString()}
              </span>
            </div>
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const showDate =
                i > 0 &&
                new Date(msg.created_at).toDateString() !==
                  new Date(prev.created_at).toDateString();
              const showSender =
                i === 0 ||
                prev.sender.id !== msg.sender.id ||
                showDate;
              const next = messages[i + 1];
              const showTime =
                !next ||
                next.sender.id !== msg.sender.id ||
                new Date(next.created_at).getTime() -
                  new Date(msg.created_at).getTime() >
                  5 * 60 * 1000;

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-2">
                      <span className="px-3 py-1 bg-gray-200 dark:bg-dark-300 rounded-full text-xs text-gray-600 dark:text-gray-400">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className={`relative group flex items-start gap-2 ${
                    msg.sender.id === user?.id ? 'justify-end text-right' : ''
                  }`}>
                    {showSender && msg.sender.id !== user?.id && (
                      <img
                        src={msg.sender.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${msg.sender.username}`}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <div className="relative">
                      {/* Message content */}
                      {msg.type === 'code' ? (
                        <CodeSnippetMessage
                          message={msg}
                          isOwn={msg.sender.id === user?.id}
                          showSender={showSender}
                          showTimestamp={showTime}
                        />
                      ) : msg.type === 'image' ? (
                        <ImageMessage
                          message={msg}
                          isOwn={msg.sender.id === user?.id}
                          showSender={showSender}
                          showTimestamp={showTime}
                        />
                      ) : msg.type === 'file' ? (
                        <FileMessage
                          message={msg}
                          isOwn={msg.sender.id === user?.id}
                          showSender={showSender}
                          showTimestamp={showTime}
                        />
                      ) : (
                        <MessageBubble
                          message={msg}
                          isOwn={msg.sender.id === user?.id}
                          showSender={showSender}
                          showTimestamp={showTime}
                          onRecall={handleRecallMessage}
                        />
                      )}

                      {/* Menu icon */}
                      <button
                        onClick={() =>
                          setShowMessageMenu(
                            showMessageMenu === msg.id ? null : msg.id
                          )
                        }
                        className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>

                      {/* Menu */}
                      <AnimatePresence>
                        {showMessageMenu === msg.id && (
                          <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-0 right-0 mt-6 w-36 bg-white dark:bg-dark-200 rounded-md shadow-lg overflow-hidden text-sm"
                          >
                            {msg.status === 'failed' && (
                              <button
                                onClick={() => {
                                  handleRetryMessage(msg.id);
                                  setShowMessageMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-300 flex items-center gap-2 text-primary-600"
                              >
                                <ChevronDown className="h-4 w-4" />
                                Retry
                              </button>
                            )}
                            {msg.type === 'file' && msg.file_url && (
                              <a
                                href={msg.file_url}
                                download={msg.file_name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-300 flex items-center gap-2"
                                onClick={() => setShowMessageMenu(null)}
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </a>
                            )}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                setShowMessageMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-300 flex items-center gap-2"
                            >
                              <Paperclip className="h-4 w-4 text-gray-500" />
                              Copy
                            </button>
                            {msg.sender.id === user?.id && !msg.is_deleted && (
                              <>
                                <button
                                  onClick={() => {
                                    handleRecallMessage(msg.id);
                                    setShowMessageMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-300 flex items-center gap-2 text-yellow-600"
                                >
                                  <ClockIcon className="h-4 w-4" />
                                  Unsend
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteMessage(msg.id);
                                    setShowMessageMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-300 flex items-center gap-2 text-red-500"
                                >
                                  <XIcon className="h-4 w-4" />
                                  Delete
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            {isTyping && typingUser && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-dark-300 flex items-center justify-center">
                  {typingUser.charAt(0).toUpperCase()}
                </div>
                <TypingIndicator username={typingUser} />
              </div>
            )}
            <div ref={messagesEndRef} className="h-0" />
          </>
        )}
      </div>

      {/* Unread banner */}
      <AnimatePresence>
        {showUnreadBanner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg"
            onClick={() => scrollToBottom()}
          >
            <ChevronDown className="inline h-4 w-4 mr-1" />
            {unreadCount} new {unreadCount > 1 ? 'messages' : 'message'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollButton && !showUnreadBanner && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => scrollToBottom()}
            className="fixed bottom-20 right-4 p-2 bg-white dark:bg-dark-300 rounded-full shadow-lg"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden md:block row-span-full border-l border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 overflow-y-auto"
          >
            {/* Chat info content... */}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Input */}
      <footer className="row-start-3 col-span-full p-4 border-t border-gray-200 dark:border-dark-300">
        <ChatInput onSend={handleSendMessage} onTyping={handleTyping} isSending={isSending} />
      </footer>
    </div>
  );
};

export default ChatBox;