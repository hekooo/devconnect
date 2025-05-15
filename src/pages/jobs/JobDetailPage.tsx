import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowLeft, 
  Building, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Edit, 
  Trash2, 
  Clock, 
  Globe, 
  Briefcase,
  Tag,
  User,
  MoreHorizontal,
  DollarSign,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface JobPost {
  id: string;
  user_id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  salary_range: string;
  tech_stack: string[];
  apply_url: string;
  deadline: string;
  is_remote: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [job, setJob] = useState<JobPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [relatedJobs, setRelatedJobs] = useState<JobPost[]>([]);

  useEffect(() => {
    if (id) {
      fetchJob();
    }
  }, [id]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          *,
          user:profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setJob(data);

      // Fetch related jobs based on tech stack
      if (data?.tech_stack && data.tech_stack.length > 0) {
        fetchRelatedJobs(data.tech_stack, data.id);
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      addToast({
        type: 'error',
        message: 'Failed to load job details',
      });
      navigate('/jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelatedJobs = async (techStack: string[], currentJobId: string) => {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          id,
          title,
          company,
          location,
          type,
          is_remote,
          deadline,
          tech_stack,
          user:profiles (
            username,
            avatar_url
          )
        `)
        .neq('id', currentJobId)
        .overlaps('tech_stack', techStack)
        .gte('deadline', new Date().toISOString())
        .limit(3);

      if (error) throw error;
      setRelatedJobs(data || []);
    } catch (error) {
      console.error('Error fetching related jobs:', error);
    }
  };

  const handleDelete = async () => {
    if (!user || !job || user.id !== job.user_id) return;

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

      navigate('/jobs');
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to delete job post',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isExpired = job ? new Date(job.deadline) < new Date() : false;
  const isOwner = user && job && user.id === job.user_id;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-dark-300 rounded w-1/4 mb-8" />
        <div className="h-12 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-4" />
        <div className="h-6 bg-gray-200 dark:bg-dark-300 rounded w-1/2 mb-8" />
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-5/6" />
          <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">Job post not found</h2>
        <Link to="/jobs" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
          <ArrowLeft className="h-5 w-5 inline mr-2" />
          Back to job listings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/jobs"
        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to job listings
      </Link>

      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-dark-300">
        {/* Job header with gradient background */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 md:p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                  {job.type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
                {job.is_remote && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    Remote
                  </span>
                )}
                {isExpired && (
                  <span className="px-3 py-1 bg-error-500/20 text-white rounded-full text-sm font-medium">
                    Expired
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
              <div className="flex items-center gap-4 text-white/80">
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  <span>{job.company}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{job.location}</span>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
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
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300"
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
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* Job details cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-4 shadow-sm">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary-500" />
                Job Type
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {job.type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-4 shadow-sm">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary-500" />
                Application Deadline
              </h3>
              <p className={`${isExpired ? 'text-error-600 dark:text-error-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {new Date(job.deadline).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {isExpired && ' (Expired)'}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-4 shadow-sm">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary-500" />
                Posted
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Salary range */}
          {job.salary_range && (
            <div className="mb-8 bg-white dark:bg-dark-200 border border-gray-100 dark:border-dark-300 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Salary Range
              </h2>
              <p className="text-gray-700 dark:text-gray-300 text-lg">{job.salary_range}</p>
            </div>
          )}

          {/* Description */}
          <div className="mb-8 bg-white dark:bg-dark-200 border border-gray-100 dark:border-dark-300 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Job Description</h2>
            <div className="prose dark:prose-invert max-w-none">
              {job.description.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="mb-8 bg-white dark:bg-dark-200 border border-gray-100 dark:border-dark-300 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary-500" />
                Requirements
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                {job.requirements.map((req, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300">{req}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tech stack */}
          {job.tech_stack && job.tech_stack.length > 0 && (
            <div className="mb-8 bg-white dark:bg-dark-200 border border-gray-100 dark:border-dark-300 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary-500" />
                Tech Stack
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.tech_stack.map((tech, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full text-sm"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Posted by */}
          <div className="mb-8 bg-white dark:bg-dark-200 border border-gray-100 dark:border-dark-300 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary-500" />
              Posted by
            </h2>
            <div className="flex items-center gap-4">
              <Link to={`/profile/${job.user.id}`}>
                <img
                  src={job.user.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${job.user.username}`}
                  alt={job.user.full_name || job.user.username}
                  className="h-12 w-12 rounded-full"
                />
              </Link>
              <div>
                <Link 
                  to={`/profile/${job.user.id}`}
                  className="font-medium hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {job.user.full_name || job.user.username}
                </Link>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{job.user.username}
                </p>
              </div>
            </div>
          </div>

          {/* Apply button */}
          <div className="sticky bottom-4 bg-white dark:bg-dark-200 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-dark-300 flex justify-center">
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-primary px-8 py-3 text-lg ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              <ExternalLink className="h-5 w-5 mr-2" />
              {isExpired ? 'Application Closed' : 'Apply for this position'}
            </a>
          </div>
        </div>
      </div>

      {/* Related jobs */}
      {relatedJobs.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Similar Job Opportunities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedJobs.map((relatedJob) => (
              <Link
                key={relatedJob.id}
                to={`/jobs/${relatedJob.id}`}
                className="bg-white dark:bg-dark-200 rounded-xl p-6 hover:shadow-md transition-shadow border border-gray-100 dark:border-dark-300"
              >
                <h3 className="font-semibold mb-2 line-clamp-2">{relatedJob.title}</h3>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-3">
                  <Building className="h-4 w-4" />
                  <span>{relatedJob.company}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {relatedJob.tech_stack.slice(0, 3).map((tech, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 dark:bg-dark-300 rounded-full text-xs"
                    >
                      {tech}
                    </span>
                  ))}
                  {relatedJob.tech_stack.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-dark-300 rounded-full text-xs">
                      +{relatedJob.tech_stack.length - 3} more
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Deadline: {new Date(relatedJob.deadline).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
};

export default JobDetailPage;