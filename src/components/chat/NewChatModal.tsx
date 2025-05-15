import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Users, Plus, User, UserPlus, Check, Lock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated?: (chatId: string) => void;
  followingUsers?: string[];
}

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  online: boolean;
  is_following?: boolean;
  is_private?: boolean;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated, followingUsers = [] }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchUsers();
      subscribeToOnlineStatus();
    }
  }, [isOpen, user, followingUsers]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First get the follows relationships
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id, follower_id')
        .or(`follower_id.eq.${user!.id},following_id.eq.${user!.id}`);

      if (followsError) throw followsError;

      // Get unique user IDs from follows
      const userIds = new Set([
        ...follows.map(f => f.following_id),
        ...follows.map(f => f.follower_id)
      ].filter(id => id !== user!.id));

      // Fetch user profiles
      if (userIds.size === 0) {
        setUsers([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, is_private')
        .in('id', Array.from(userIds));

      if (profilesError) throw profilesError;

      // Map follows data to profiles
      const mappedUsers = profiles.map(profile => ({
        ...profile,
        online: false,
        is_following: follows.some(f => 
          f.follower_id === user!.id && f.following_id === profile.id
        )
      }));

      setUsers(mappedUsers);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToOnlineStatus = () => {
    if (!socket) return;
    
    socket.on('userOnline', id => setOnlineUsers(prev => new Set(prev).add(id)));
    socket.on('userOffline', id => setOnlineUsers(prev => { 
      const s = new Set(prev); 
      s.delete(id); 
      return s; 
    }));
    
    socket.emit('getOnlineUsers', (ids: string[]) => setOnlineUsers(new Set(ids)));
    
    return () => {
      socket.off('userOnline');
      socket.off('userOffline');
    };
  };

  const startDirectChat = async (selected: User) => {
    if (!user) return;
    setIsCreating(true);

    try {
      // Check if the user can message the selected user
      const canMessage = followingUsers.includes(selected.id) || await isFollowedBy(selected.id);
      
      if (!canMessage) {
        addToast({ 
          type: 'error', 
          message: 'You can only message users who follow you or whom you follow' 
        });
        setIsCreating(false);
        return;
      }

      // 1) Get current user's chat IDs
      const { data: myChatMemberships, error: err1 } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id);
      
      if (err1) throw err1;
      const myChatIds = myChatMemberships?.map(m => m.chat_id) || [];

      // 2) Get selected user's chat IDs
      const { data: selectedUserChatMemberships, error: err2 } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', selected.id);
      
      if (err2) throw err2;
      const selectedUserChatIds = selectedUserChatMemberships?.map(m => m.chat_id) || [];

      // 3) Find common chats (direct chats between the two users)
      const commonChatIds = myChatIds.filter(id => selectedUserChatIds.includes(id));
      
      // 4) Check if any common chat is a direct chat
      if (commonChatIds.length > 0) {
        // Verify these are direct chats
        const { data: commonChats } = await supabase
          .from('chats')
          .select('id, type')
          .in('id', commonChatIds)
          .eq('type', 'direct');
        
        if (commonChats && commonChats.length > 0) {
          // Use existing direct chat
          if (onChatCreated) {
            onChatCreated(commonChats[0].id);
          } else {
            navigate(`/messages/${commonChats[0].id}`);
            onClose();
          }
          return;
        }
      }

      // 5) Create new direct chat
      const { data: newChat, error: err3 } = await supabase
        .from('chats')
        .insert({
          type: 'direct',
          creator_id: user.id
        })
        .select()
        .single();
      
      if (err3) throw err3;

      // 6) Add both users as members
      const { error: err4 } = await supabase
        .from('chat_members')
        .insert([
          { chat_id: newChat.id, user_id: user.id },
          { chat_id: newChat.id, user_id: selected.id }
        ]);
      
      if (err4) throw err4;

      if (onChatCreated) {
        onChatCreated(newChat.id);
      } else {
        navigate(`/messages/${newChat.id}`);
        onClose();
      }
    } catch (err: any) {
      console.error('Error creating chat:', err);
      addToast({ 
        type: 'error', 
        message: 'Failed to start conversation' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const isFollowedBy = async (userId: string): Promise<boolean> => {
    if (!user) return false;
    
    const { data } = await supabase
      .from('follows')
      .select()
      .eq('follower_id', userId)
      .eq('following_id', user.id)
      .maybeSingle();
    
    return !!data;
  };

  const createGroupChat = async () => {
    if (!user || selectedUsers.length === 0) return;
    
    if (!groupName.trim()) {
      addToast({
        type: 'error',
        message: 'Please enter a group name'
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      // 1) Create new group chat
      const { data: newChat, error: err1 } = await supabase
        .from('chats')
        .insert({
          type: 'group',
          name: groupName.trim(),
          creator_id: user.id
        })
        .select()
        .single();
      
      if (err1) throw err1;
      
      // 2) Add all selected users and current user as members
      const members = [
        { chat_id: newChat.id, user_id: user.id },
        ...selectedUsers.map(u => ({ chat_id: newChat.id, user_id: u.id }))
      ];
      
      const { error: err2 } = await supabase
        .from('chat_members')
        .insert(members);
      
      if (err2) throw err2;
      
      if (onChatCreated) {
        onChatCreated(newChat.id);
      } else {
        navigate(`/messages/${newChat.id}`);
        onClose();
      }
    } catch (err: any) {
      console.error('Error creating group chat:', err);
      addToast({
        type: 'error',
        message: 'Failed to create group chat'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUserSelection = (selectedUser: User) => {
    if (selectedUsers.some(u => u.id === selectedUser.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== selectedUser.id));
    } else {
      setSelectedUsers([...selectedUsers, selectedUser]);
    }
  };

  const handleNext = () => {
    if (chatType === 'direct' && selectedUsers.length === 1) {
      startDirectChat(selectedUsers[0]);
    } else if (chatType === 'group' && selectedUsers.length > 0) {
      setStep(2);
    } else {
      addToast({
        type: 'error',
        message: chatType === 'direct' 
          ? 'Please select a user to chat with' 
          : 'Please select at least one user for the group'
      });
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleCreateGroup = () => {
    createGroupChat();
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-dark-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
      >
        {step === 1 ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-300">
              <h2 className="text-xl font-semibold">New Message</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Chat type selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setChatType('direct')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${
                    chatType === 'direct'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
                      : 'bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-400'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span>Direct Message</span>
                </button>
                
                <button
                  onClick={() => setChatType('group')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${
                    chatType === 'group'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
                      : 'bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-400'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span>Group Chat</span>
                </button>
              </div>
              
              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    {chatType === 'direct' ? 'Selected User' : 'Selected Users'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div 
                        key={user.id}
                        className="flex items-center gap-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full text-sm"
                      >
                        <img 
                          src={user.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"}
                          alt={user.username}
                          className="w-4 h-4 rounded-full"
                        />
                        <span>{user.full_name || user.username}</span>
                        <button
                          onClick={() => toggleUserSelection(user)}
                          className="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder={`Search ${chatType === 'direct' ? 'users' : 'people to add'}...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-400 rounded-lg"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse mb-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-dark-300" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 dark:bg-dark-300 rounded w-1/4" />
                      </div>
                    </div>
                  ))
                ) : error ? (
                  <div className="text-center py-8">
                    <div className="text-error-500 mb-2">
                      <AlertCircle className="h-12 w-12 mx-auto" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                    <button 
                      onClick={fetchUsers}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {searchQuery 
                      ? `No users found matching "${searchQuery}"` 
                      : "You don't have any connections yet"}
                  </div>
                ) : (
                  filtered.map(u => (
                    <div
                      key={u.id}
                      onClick={() => {
                        if (chatType === 'direct') {
                          setSelectedUsers([u]);
                        } else {
                          toggleUserSelection(u);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer mb-2 ${
                        selectedUsers.some(selected => selected.id === u.id)
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-dark-300'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={u.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"}
                          alt={u.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {onlineUsers.has(u.id) && (
                          <span className="absolute bottom-0 right-0 block w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-dark-200" />
                        )}
                        {u.is_private && (
                          <span className="absolute top-0 right-0 bg-gray-800 text-white p-0.5 rounded-full">
                            <Lock className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{u.full_name || u.username}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                      </div>
                      <div>
                        {selectedUsers.some(selected => selected.id === u.id) ? (
                          <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 dark:border-dark-400 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-dark-300 flex justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleNext}
                disabled={selectedUsers.length === 0 || isCreating}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedUsers.length > 0 && !isCreating
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-300 dark:bg-dark-400 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {isCreating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    {chatType === 'direct' ? 'Starting Chat...' : 'Next'}
                  </div>
                ) : (
                  chatType === 'direct' ? 'Start Chat' : 'Next'
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-300">
              <h2 className="text-xl font-semibold">Create Group Chat</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full"
                />
              </div>
              
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">
                  Group Members ({selectedUsers.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(user => (
                    <div 
                      key={user.id}
                      className="flex items-center gap-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full text-sm"
                    >
                      <img 
                        src={user.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"}
                        alt={user.username}
                        className="w-4 h-4 rounded-full"
                      />
                      <span>{user.full_name || user.username}</span>
                      <button
                        onClick={() => toggleUserSelection(user)}
                        className="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add more people</span>
              </button>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-dark-300 flex justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md transition-colors"
              >
                Back
              </button>
              
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || isCreating}
                className={`px-4 py-2 rounded-md transition-colors ${
                  groupName.trim() && !isCreating
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-300 dark:bg-dark-400 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {isCreating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Creating...
                  </div>
                ) : (
                  'Create Group'
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default NewChatModal;