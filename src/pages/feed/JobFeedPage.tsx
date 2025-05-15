import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Filter, MapPin, Building, Clock, ExternalLink, Briefcase, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import JobCard from '../../components/job/JobCard';
import supabase from '../../lib/supabase';

interface Job {
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
  user: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

type JobType = 'all' | 'full-time' | 'part-time' | 'contract' | 'internship';
type LocationType = 'all' | 'remote' | 'onsite' | 'hybrid';

const JobFeedPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobType, setJobType] = useState<JobType>('all');
  const [locationType, setLocationType] = useState<LocationType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchJobs();
  }, [jobType, locationType, searchQuery, selectedTech, page]);

  const fetchJobs = async () => {
    try {
      let query = supabase
        .from('job_posts')
        .select(`
          *,
          user:profiles (
            username,
            full_name,
            avatar_url
          )
        `)
        .gte('deadline', new Date().toISOString())
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (jobType !== 'all') {
        query = query.eq('type', jobType);
      }

      if (locationType !== 'all') {
        query = query.eq('is_remote', locationType === 'remote');
      }

      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      if (selectedTech) {
        query = query.contains('tech_stack', [selectedTech]);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (page === 1) {
        setJobs(data || []);
      } else {
        setJobs(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data || []).length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const handleDeleteJob = (jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  };

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Job Opportunities</h1>
        <Link to="/jobs/post" className="btn-primary">
          <PlusCircle className="h-5 w-5 mr-2" />
          Post a Job
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1">
          {/* Search and filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 py-3 rounded-xl"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>

            <div className="flex flex-wrap gap-4 bg-white dark:bg-dark-200 p-4 rounded-xl shadow-sm">
              <div className="space-x-2">
                <span className="text-sm font-medium flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" /> Type:
                </span>
                {(['all', 'full-time', 'part-time', 'contract', 'internship'] as JobType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setJobType(type)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      jobType === type
                        ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                    }`}
                  >
                    {type === 'all' ? 'All' : type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </button>
                ))}
              </div>

              <div className="space-x-2">
                <span className="text-sm font-medium flex items-center">
                  <Globe className="h-4 w-4 mr-1" /> Location:
                </span>
                {(['all', 'remote', 'onsite', 'hybrid'] as LocationType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setLocationType(type)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      locationType === type
                        ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Jobs list */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-dark-200 rounded-xl p-6 animate-pulse"
                >
                  <div className="h-6 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-dark-200 rounded-xl shadow-sm">
              <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No jobs found</h2>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? `No jobs match "${searchQuery}"`
                  : "No job opportunities available at the moment"}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onDelete={() => handleDeleteJob(job.id)} 
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                    className="btn-outline"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-72">
          <div className="bg-white dark:bg-dark-200 rounded-xl p-6 sticky top-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Popular Technologies</h3>
            <div className="space-y-2">
              {['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker'].map((tech) => (
                <button
                  key={tech}
                  onClick={() => setSelectedTech(selectedTech === tech ? null : tech)}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTech === tech
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                  }`}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobFeedPage;