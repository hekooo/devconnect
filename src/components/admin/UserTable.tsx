import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ban,
  CheckCircle,
  MoreHorizontal,
  Search,
  Eye,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  status: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at: string;
}

const ConfirmDialog: React.FC<{
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-dark-200 p-6 rounded-lg shadow-lg max-w-sm w-full">
      <p className="mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

const EditModal: React.FC<{
  user: User;
  onSave: (updates: Partial<User>) => void;
  onClose: () => void;
}> = ({ user, onSave, onClose }) => {
  const [fullName, setFullName] = useState(user.full_name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ full_name: fullName, username, email, role, status });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-dark-200 p-6 rounded-lg shadow-lg w-full max-w-md"
      >
        <h2 className="text-xl font-semibold mb-4">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm">Full Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const UserTable: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserMenu, setSelectedUserMenu] = useState<string| null>(null);
  const [editingUser, setEditingUser] = useState<User|null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string|null>(null);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let q = supabase
        .from('profiles')
        .select('*')
        .order('created_at',{ascending:false});
      if (searchQuery) {
        q = q.or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      setUsers(data||[]);
    } catch (err) {
      console.error(err);
      addToast({ type:'error', message:'Failed to load users' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (id:string, updates:Partial<User>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      setUsers(us => us.map(u => u.id===id?{...u,...updates}:u));
      addToast({ type:'success', message:'User updated' });
    } catch(err) {
      console.error(err);
      addToast({ type:'error', message:'Update failed' });
    }
  };

  const deleteUser = async (id:string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setUsers(us => us.filter(u=>u.id!==id));
      addToast({ type:'success', message:'User deleted' });
    } catch(err) {
      console.error(err);
      addToast({ type:'error', message:'Delete failed' });
    }
  };

  return (
    <div className="p-6 relative">
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
            className="w-full pl-10 py-2 border rounded"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="py-3 px-4 text-left">User</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Role</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Joined</th>
              <th className="py-3 px-4 text-left">Last Active</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? [...Array(5)].map((_,i)=>(
                  <tr key={i}>
                    <td colSpan={7} className="py-4 px-4 animate-pulse h-4 bg-gray-200 rounded"/>
                  </tr>
                ))
              : users.map(user=>(
                  <motion.tr
                    key={user.id}
                    initial={{opacity:0}}
                    animate={{opacity:1}}
                    className="group hover:bg-gray-50"
                  >
                    <td className="py-4 px-4 flex items-center gap-3">
                      <img
                        src={user.avatar_url||`https://api.dicebear.com/7.x/avatars/svg?seed=${user.username}`}
                        alt={user.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">{user.email}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role==='admin'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>{user.role}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.status==='active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>{user.status}</span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="py-4 px-4 relative">
                      <div className="flex justify-end gap-2">
                        {user.status==='active' ? (
                          <button
                            onClick={()=>window.confirm('Ban this user?')&&updateUser(user.id,{status:'banned'})}
                            className="p-2 text-gray-500 hover:text-red-600"
                          >
                            <Ban className="h-5 w-5"/>
                          </button>
                        ) : (
                          <button
                            onClick={()=>window.confirm('Unban this user?')&&updateUser(user.id,{status:'active'})}
                            className="p-2 text-gray-500 hover:text-green-600"
                          >
                            <CheckCircle className="h-5 w-5"/>
                          </button>
                        )}
                        <button
                          onClick={()=>setSelectedUserMenu(prev=>prev===user.id?null:user.id)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                        >
                          <MoreHorizontal className="h-5 w-5"/>
                        </button>
                      </div>
                      {selectedUserMenu===user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow z-10">
                          <button
                            onClick={()=>{navigate(`/profile/${user.id}`); setSelectedUserMenu(null)}}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4"/> View profile
                          </button>
                          <button
                            onClick={()=>{setEditingUser(user); setSelectedUserMenu(null)}}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                          >
                            <Edit2 className="h-4 w-4"/> Edit
                          </button>
                          <button
                            onClick={()=>{setDeletingUserId(user.id); setSelectedUserMenu(null)}}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            <Trash2 className="h-4 w-4"/> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))
            }
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editingUser && (
          <EditModal
            user={editingUser}
            onSave={updates => {
              updateUser(editingUser.id, updates);
              setEditingUser(null);
            }}
            onClose={()=>setEditingUser(null)}
          />
        )}
        {deletingUserId && (
          <ConfirmDialog
            message="This will permanently delete the user. Continue?"
            onConfirm={()=>{ deleteUser(deletingUserId); setDeletingUserId(null); }}
            onCancel={()=>setDeletingUserId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserTable;
