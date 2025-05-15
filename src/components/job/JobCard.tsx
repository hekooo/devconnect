import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Building, MapPin, Calendar, ExternalLink, MoreHorizontal, Edit, Trash2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface JobCardProps {
  job: {
    id: string;
    user_id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    description: string;
    tech_stack: string[];
    apply_url: string;
    deadline: string;
    is_remote: boolean;
    created_at: string;
    user?: {
      username: string;
      avatar_url: string;
    };
  };
  onDelete?: () => void;
  compact?: boolean;
}

const JobCard: React.FC<JobCardProps> = ({ job, onDelete, compact = false }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.id === job.user_id;
  const isExpired = new Date(job.deadline) < new Date();

  const handleDelete = async () => {
    if (!isOwner) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', job.id);

      if (error) throw error;

      addToast({
        type: 'success',
        message: 'Job post deleted successfully',
      });

      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      addToast({
        type: 'error',
        message: 'Failed to delete job post',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-gray-100 dark:border-dark-300"
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link to={`/jobs/${job.id}`} className="block">
              <h3 className="text-xl font-semibold mb-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                {job.title}
              </h3>
            </Link>
            <div className="flex flex-wrap items-center gap-4 text-gray-500 dark:text-gray-400 mb-4">
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                <span>{job.company}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{job.location}</span>
              </div>
              {job.is_remote && (
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <span>Remote</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className={isExpired ? 'text-error-600 dark:text-error-400' : ''}>
                  {isExpired ? 'Expired' : 'Deadline'}: {new Date(job.deadline).toLocaleDateString()}
                </span>
              </div>
            </div>

            {!compact && (
              <>
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {job.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {job.tech_stack.slice(0, 5).map((tech, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full text-xs"
                    >
                      {tech}
                    </span>
                  ))}
                  {job.tech_stack.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-dark-300 rounded-full text-xs">
                      +{job.tech_stack.length - 5} more
                    </span>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </div>
              
              <div className="flex items-center gap-2">
                {isOwner && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-full"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    <AnimatePresence>
                      {showMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-200 rounded-md shadow-lg z-10"
                        >
                          <Link
                            to={`/jobs/edit/${job.id}`}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-300"
                          >
                            <Edit className="h-4 w-4" />
                            Edit job post
                          </Link>
                          <button
                            onClick={() => {
                              setShowMenu(false);
                              setShowDeleteConfirm(true);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error-600 hover:bg-gray-100 dark:hover:bg-dark-300"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete job post
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                
                <Link
                  to={`/jobs/${job.id}`}
                  className="px-4 py-2 bg-gray-100 dark:bg-dark-300 hover:bg-gray-200 dark:hover:bg-dark-400 rounded-md text-sm font-medium transition-colors"
                >
                  View Details
                </Link>
                
                <a
                  href={job.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn-primary ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={(e) => {
                    if (isExpired) {
                      e.preventDefault();
                      addToast({
                        type: 'warning',
                        message: 'This job posting has expired',
                      });
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Delete Job Post</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this job post? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-error-600 hover:bg-error-700 rounded-md disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default JobCard;