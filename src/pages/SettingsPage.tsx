import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Lock,
  Bell,
  Palette,
  Globe,
  Camera,
  Upload,
  Trash2,
  Save,
  EyeOff,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../contexts/ThemeContext';
import supabase from '../lib/supabase';

type SettingsTab = 'profile' | 'account' | 'notifications' | 'appearance' | 'privacy';

interface ProfileFormData {
  full_name: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  github_url: string;
  linkedin_url: string;
  skills: string;
  tech_stack: string;
}

interface AccountFormData {
  email: string;
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  notification_types: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    mentions: boolean;
  };
}

interface PrivacySettings {
  is_private: boolean;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    notification_types: {
      likes: true,
      comments: true,
      follows: true,
      mentions: true,
    },
  });
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    is_private: false
  });

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfileForm,
    setValue: setProfileValue
  } = useForm<ProfileFormData>();

  const {
    register: registerAccount,
    handleSubmit: handleAccountSubmit,
    formState: { errors: accountErrors },
    watch,
  } = useForm<AccountFormData>();

  const newPassword = watch('new_password');

  // Load profile data when user or active tab changes
  useEffect(() => {
    if (user && (activeTab === 'profile' || activeTab === 'privacy')) {
      fetchProfileData();
    }
  }, [user, activeTab]);

  const fetchProfileData = async () => {
    if (!user) return;
    
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData(data);
        // Set form values
        setProfileValue('full_name', data.full_name || '');
        setProfileValue('username', data.username || '');
        setProfileValue('bio', data.bio || '');
        setProfileValue('location', data.location || '');
        setProfileValue('website', data.website || '');
        setProfileValue('github_url', data.github_url || '');
        setProfileValue('linkedin_url', data.linkedin_url || '');
        setProfileValue('skills', data.skills ? data.skills.join(', ') : '');
        setProfileValue('tech_stack', data.tech_stack ? data.tech_stack.join(', ') : '');
        
        // Set privacy settings
        setPrivacySettings({
          is_private: data.is_private || false
        });
        
        // Set notification settings if they exist
        if (data.notification_settings) {
          setNotificationSettings(data.notification_settings);
        }
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      addToast({ type: 'error', message: 'Failed to load profile data' });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const parseArrayField = (value: string): string[] | null => {
    if (!value.trim()) return null;
    return value.split(',').map(v => v.trim()).filter(Boolean);
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      let avatarUrl = profileData?.avatar_url || user.user_metadata?.avatar_url;
      let coverUrl = profileData?.cover_url || user.user_metadata?.cover_url;

      if (avatarFile) {
        // Delete old avatar if exists
        if (avatarUrl) {
          const oldPath = avatarUrl.split('/').pop();
          await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`]);
        }

        const ext = avatarFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `${user.id}/${fileName}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      if (coverFile) {
        // Delete old cover if exists
        if (coverUrl) {
          const oldPath = coverUrl.split('/').pop();
          await supabase.storage.from('covers').remove([`${user.id}/${oldPath}`]);
        }

        const ext = coverFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `${user.id}/${fileName}`;
        const { error: upErr } = await supabase.storage.from('covers').upload(path, coverFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path);
        coverUrl = urlData.publicUrl;
      }

      const skills = parseArrayField(data.skills);
      const tech_stack = parseArrayField(data.tech_stack);

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ 
          ...data, 
          skills, 
          tech_stack, 
          avatar_url: avatarUrl, 
          cover_url: coverUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateErr) throw updateErr;
      
      // Update local state
      setProfileData({
        ...profileData,
        ...data,
        skills,
        tech_stack,
        avatar_url: avatarUrl,
        cover_url: coverUrl
      });
      
      addToast({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAccountSubmit = async (data: AccountFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (data.new_password) {
        const { error } = await supabase.auth.updateUser({ password: data.new_password });
        if (error) throw error;
      }
      addToast({ type: 'success', message: 'Account settings updated!' });
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', message: err.message || 'Failed to update account' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotificationChange = (type: keyof NotificationSettings['notification_types']) => {
    setNotificationSettings(prev => ({
      ...prev,
      notification_types: {
        ...prev.notification_types,
        [type]: !prev.notification_types[type],
      },
    }));
  };

  const saveNotificationSettings = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_settings: notificationSettings })
        .eq('id', user.id);

      if (error) throw error;
      addToast({ type: 'success', message: 'Notification settings saved!' });
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', message: err.message || 'Failed to save notification settings' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePrivacy = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const newValue = !privacySettings.is_private;
      
      const { error } = await supabase
        .from('profiles')
        .update({ is_private: newValue })
        .eq('id', user.id);

      if (error) throw error;
      
      setPrivacySettings({ ...privacySettings, is_private: newValue });
      addToast({ 
        type: 'success', 
        message: `Your profile is now ${newValue ? 'private' : 'public'}!` 
      });
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', message: err.message || 'Failed to update privacy settings' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <nav className="col-span-1 bg-white dark:bg-gray-800 rounded-xl p-4 space-y-2">
          {(['profile','account','notifications','appearance','privacy'] as SettingsTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {{
                profile: <User className="h-5 w-5"/>,
                account: <Lock className="h-5 w-5"/>,
                notifications: <Bell className="h-5 w-5"/>,
                appearance: <Palette className="h-5 w-5"/>,
                privacy: <EyeOff className="h-5 w-5"/>
              }[tab]}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {/* Main */}
        <div className="col-span-1 md:col-span-3 bg-white dark:bg-gray-800 rounded-xl p-6 space-y-6">
          {/* Profile */}
          {activeTab === 'profile' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleProfileSubmit(onProfileSubmit)}
              className="space-y-6"
            >
              <h2 className="text-lg font-semibold">Profile Settings</h2>

              {loadingProfile ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <>
                  {/* Cover */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Cover Photo</label>
                    <div className="relative h-40 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
                      {(coverPreview || profileData?.cover_url) && (
                        <img
                          src={coverPreview || profileData.cover_url}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverChange}
                        />
                        <Upload className="h-6 w-6 text-white" />
                      </label>
                    </div>
                  </div>

                  {/* Avatar */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Profile Picture</label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={
                            avatarPreview ||
                            profileData?.avatar_url ||
                            "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                          }
                          alt="Avatar"
                          className="h-20 w-20 rounded-full object-cover"
                        />
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                          <Camera className="h-5 w-5 text-white" />
                        </label>
                      </div>
                      <div>
                        <p className="font-medium">Upload profile picture</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          JPG or PNG, max 1MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Full Name</label>
                      <input
                        type="text"
                        className="w-full"
                        {...registerProfile('full_name', { required: 'Required' })}
                      />
                      {profileErrors.full_name && (
                        <p className="text-xs text-red-500 mt-1">{profileErrors.full_name.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Username</label>
                      <input
                        type="text"
                        className="w-full"
                        {...registerProfile('username', {
                          required: 'Required',
                          pattern: { value: /^[\w]+$/, message: 'Alphanumeric only' }
                        })}
                      />
                      {profileErrors.username && (
                        <p className="text-xs text-red-500 mt-1">{profileErrors.username.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Bio</label>
                    <textarea rows={3} className="w-full" {...registerProfile('bio')} />
                  </div>

                  {/* Location & Website */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Location</label>
                      <input type="text" className="w-full" {...registerProfile('location')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Website</label>
                      <input type="url" className="w-full" {...registerProfile('website')} />
                    </div>
                  </div>

                  {/* GitHub & LinkedIn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">GitHub URL</label>
                      <input type="url" className="w-full" {...registerProfile('github_url')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
                      <input type="url" className="w-full" {...registerProfile('linkedin_url')} />
                    </div>
                  </div>

                  {/* Skills & Tech Stack */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Skills</label>
                      <input
                        type="text"
                        className="w-full"
                        placeholder="e.g. JavaScript, React"
                        {...registerProfile('skills')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tech Stack</label>
                      <input
                        type="text"
                        className="w-full"
                        placeholder="e.g. Node.js, Docker"
                        {...registerProfile('tech_stack')}
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md"
                      disabled={isSubmitting}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </motion.form>
          )}

          {/* Account */}
          {activeTab === 'account' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleAccountSubmit(onAccountSubmit)}
              className="space-y-6"
            >
              <h2 className="text-lg font-semibold">Account Settings</h2>

              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full bg-gray-100 dark:bg-gray-700"
                  value={user?.email}
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <input
                  type="password"
                  className="w-full"
                  {...registerAccount('current_password', { required: 'Required' })}
                />
                {accountErrors.current_password && (
                  <p className="text-xs text-red-500 mt-1">{accountErrors.current_password.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    className="w-full"
                    {...registerAccount('new_password', {
                      minLength: { value: 8, message: 'At least 8 chars' }
                    })}
                  />
                  {accountErrors.new_password && (
                    <p className="text-xs text-red-500 mt-1">{accountErrors.new_password.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    className="w-full"
                    {...registerAccount('confirm_password', {
                      validate: val => val === newPassword || 'Passwords must match'
                    })}
                  />
                  {accountErrors.confirm_password && (
                    <p className="text-xs text-red-500 mt-1">{accountErrors.confirm_password.message}</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  className="flex items-center text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5 mr-1" />
                  Delete Account
                </button>
              </div>

              <div className="text-right">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md"
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </button>
              </div>
            </motion.form>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-lg font-semibold">Notification Settings</h2>

              {loadingProfile ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notificationSettings.email_notifications}
                        onChange={() =>
                          setNotificationSettings(ps => ({ ...ps, email_notifications: !ps.email_notifications }))
                        }
                      />
                      <span className="ml-2">Email Notifications</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notificationSettings.push_notifications}
                        onChange={() =>
                          setNotificationSettings(ps => ({ ...ps, push_notifications: !ps.push_notifications }))
                        }
                      />
                      <span className="ml-2">Push Notifications</span>
                    </label>
                  </div>

                  <h3 className="mt-4 font-medium">Event Types</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(['likes', 'comments', 'follows', 'mentions'] as const).map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings.notification_types[type]}
                          onChange={() => handleNotificationChange(type)}
                        />
                        <span className="ml-2 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md"
                      onClick={saveNotificationSettings}
                      disabled={isSubmitting}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-lg font-semibold">Appearance</h2>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className={`p-4 rounded-xl border-2 ${
                    theme === 'light'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-500'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => theme === 'light' && toggleTheme()}
                  className={`p-4 rounded-xl border-2 ${
                    theme === 'dark'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-500'
                  }`}
                >
                  Dark
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <select className="w-full p-2 rounded-md bg-gray-100 dark:bg-gray-700">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </motion.div>
          )}

          {/* Privacy */}
          {activeTab === 'privacy' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-lg font-semibold">Privacy Settings</h2>

              {loadingProfile ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-lg mb-1">Private Profile</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          When your profile is private, only people who follow you can see your posts, stories, and other content.
                        </p>
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={togglePrivacy}
                          disabled={isSubmitting}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                            privacySettings.is_private
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {isSubmitting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          ) : privacySettings.is_private ? (
                            <><Lock className="h-4 w-4" /> Private</>
                          ) : (
                            <><Eye className="h-4 w-4" /> Public</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <h3 className="font-medium text-lg mb-1">Who Can Message You</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Control who can send you direct messages.
                    </p>
                    
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="message_privacy"
                          checked={true}
                          className="mr-2"
                          readOnly
                        />
                        <div>
                          <p className="font-medium">People you follow and who follow you</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Only people with a mutual follow relationship can message you
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;