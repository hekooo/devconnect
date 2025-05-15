import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Flag, BarChart3 } from 'lucide-react';
import UserTable from '../components/admin/UserTable';
import ReportManager from '../components/admin/ReportManager';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';

type AdminTab = 'users' | 'reports' | 'analytics';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Tab navigation */}
      <div className="flex gap-4 mb-8 border-b border-gray-200 dark:border-dark-300">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'users'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Users</span>
          </div>
          {activeTab === 'users' && (
            <motion.div
              layoutId="adminTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'reports'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            <span>Reports</span>
          </div>
          {activeTab === 'reports' && (
            <motion.div
              layoutId="adminTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'analytics'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </div>
          {activeTab === 'analytics' && (
            <motion.div
              layoutId="adminTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
            />
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm">
        {activeTab === 'users' && <UserTable />}
        {activeTab === 'reports' && <ReportManager />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
      </div>
    </div>
  );
};

export default AdminPage