import { useState, useEffect } from 'react';
import { Check, X, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface Report {
  id: string;
  reporter: {
    id: string;
    username: string;
    avatar_url: string;
  };
  content_type: string;
  content_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  created_at: string;
}

const ReportManager = () => {
  const { addToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReports();
  }, [filter, searchQuery]);

  const fetchReports = async () => {
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reporter_id (
            id,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      if (searchQuery) {
        query = query.or(`reason.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      addToast({
        type: 'error',
        message: 'Failed to load reports',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      setReports(reports.map(report =>
        report.id === reportId ? { ...report, status: 'resolved' } : report
      ));

      addToast({
        type: 'success',
        message: 'Report resolved successfully',
      });
    } catch (error) {
      console.error('Error resolving report:', error);
      addToast({
        type: 'error',
        message: 'Failed to resolve report',
      });
    }
  };

  const handleRejectReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'rejected',
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      setReports(reports.map(report =>
        report.id === reportId ? { ...report, status: 'rejected' } : report
      ));

      addToast({
        type: 'success',
        message: 'Report rejected successfully',
      });
    } catch (error) {
      console.error('Error rejecting report:', error);
      addToast({
        type: 'error',
        message: 'Failed to reject report',
      });
    }
  };

  return (
    <div className="p-6">
      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'all'
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-dark-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'pending'
                ? 'bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400'
                : 'hover:bg-gray-100 dark:hover:bg-dark-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'resolved'
                ? 'bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400'
                : 'hover:bg-gray-100 dark:hover:bg-dark-300'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'rejected'
                ? 'bg-error-100 dark:bg-error-900/20 text-error-700 dark:text-error-400'
                : 'hover:bg-gray-100 dark:hover:bg-dark-300'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Reports list */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-50 dark:bg-dark-300 rounded-lg p-4 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-dark-400 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-dark-400 rounded mb-2" />
                  <div className="h-3 w-24 bg-gray-200 dark:bg-dark-400 rounded" />
                </div>
              </div>
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-dark-400 rounded" />
            </div>
          ))
        ) : (
          reports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 dark:bg-dark-300 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={report.reporter.avatar_url}
                    alt={report.reporter.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="font-medium">
                      Reported by @{report.reporter.username}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.status === 'pending'
                      ? 'bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400'
                      : report.status === 'resolved'
                      ? 'bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400'
                      : 'bg-error-100 dark:bg-error-900/20 text-error-700 dark:text-error-400'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Content Type: {report.content_type}
                </div>
                <p className="text-gray-700 dark:text-gray-300">{report.reason}</p>
              </div>

              {report.status === 'pending' && (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleRejectReport(report.id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleResolveReport(report.id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 rounded"
                  >
                    <Check className="h-4 w-4" />
                    Resolve
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportManager