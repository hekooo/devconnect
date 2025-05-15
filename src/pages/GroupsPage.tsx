import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Users, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import supabase from '../lib/supabase';

interface Group {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  cover_url: string;
  is_private: boolean;
  owner_id: string;
  created_at: string;
  owner: {
    username: string;
    avatar_url: string;
  };
  members: [{
    count: number;
  }];
  is_member: boolean;
}

const GroupsPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGroups();
  }, [searchQuery]);

  const fetchGroups = async () => {
    try {
      let query = supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          avatar_url,
          cover_url,
          is_private,
          owner_id,
          created_at,
          owner:profiles!owner_id (
            username,
            avatar_url
          ),
          members:group_members (
            count
          )
        `);

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Check membership status for each group
      if (user) {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        const memberGroupIds = new Set(memberships?.map(m => m.group_id));

        setGroups(data?.map(group => ({
          ...group,
          is_member: memberGroupIds.has(group.id),
        })) || []);
      } else {
        setGroups(data || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      addToast({
        type: 'error',
        message: 'Failed to load groups',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      addToast({
        type: 'error',
        message: 'Please sign in to join groups',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
        });

      if (error) throw error;

      setGroups(groups.map(group =>
        group.id === groupId ? { ...group, is_member: true } : group
      ));

      addToast({
        type: 'success',
        message: 'Successfully joined the group!',
      });
    } catch (error) {
      console.error('Error joining group:', error);
      addToast({
        type: 'error',
        message: 'Failed to join group',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Groups</h1>
        <Link to="/groups/new" className="btn-primary">
          <PlusCircle className="h-5 w-5 mr-2" />
          Create Group
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-dark-200 rounded-xl p-6 animate-pulse"
            >
              <div className="h-32 bg-gray-200 dark:bg-dark-300 rounded-lg mb-4" />
              <div className="h-6 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No groups found</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery
              ? `No groups match "${searchQuery}"`
              : "There are no groups yet. Be the first to create one!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-dark-200 rounded-xl overflow-hidden"
            >
              <div
                className="h-32 bg-cover bg-center"
                style={{
                  backgroundImage: group.cover_url
                    ? `url(${group.cover_url})`
                    : 'linear-gradient(to right, var(--tw-gradient-stops))',
                }}
              />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={group.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${group.name}`}
                      alt={group.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold">
                        {group.name}
                        {group.is_private && (
                          <Lock className="h-4 w-4 inline ml-2 text-gray-400" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {group.members[0].count} members
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {group.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Created by @{group.owner.username}
                  </div>
                  {group.is_member ? (
                    <Link
                      to={`/groups/${group.id}`}
                      className="btn-outline"
                    >
                      View Group
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleJoinGroup(group.id)}
                      className="btn-primary"
                    >
                      Join Group
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsPage;