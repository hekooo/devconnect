import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Building, MapPin, Calendar, DollarSign, Briefcase, Globe, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface JobFormData {
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  description: string;
  requirements: string;
  salary_range: string;
  tech_stack: string;
  apply_url: string;
  deadline: string;
  is_remote: boolean;
}

const EditJobPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<JobFormData>();

  // Watch values for conditional rendering
  const watchType = watch('type');
  const watchIsRemote = watch('is_remote');

  useEffect(() => {
    if (id) {
      fetchJob();
    }
  }, [id]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Verify ownership
      if (data.user_id !== user?.id) {
        addToast({
          type: 'error',
          message: 'You do not have permission to edit this job post',
        });
        navigate('/jobs');
        return;
      }

      // Format the date for the form
      const deadlineDate = new Date(data.deadline);
      const formattedDeadline = deadlineDate.toISOString().split('T')[0];

      // Format requirements array to string
      const requirementsString = (data.requirements || []).join('\n');

      // Format tech stack array to string
      const techStackString = (data.tech_stack || []).join(', ');

      // Set form values
      reset({
        title: data.title,
        company: data.company,
        location: data.location,
        type: data.type,
        description: data.description,
        requirements: requirementsString,
        salary_range: data.salary_range,
        tech_stack: techStackString,
        apply_url: data.apply_url,
        deadline: formattedDeadline,
        is_remote: data.is_remote,
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      addToast({
        type: 'error',
        message: 'Failed to load job post',
      });
      navigate('/jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: JobFormData) => {
    if (!user || !id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({
          title: data.title,
          company: data.company,
          location: data.location,
          type: data.type,
          description: data.description,
          requirements: data.requirements.split('\n').filter(Boolean),
          salary_range: data.salary_range,
          tech_stack: data.tech_stack.split(',').map(tech => tech.trim()).filter(Boolean),
          apply_url: data.apply_url,
          deadline: new Date(data.deadline).toISOString(),
          is_remote: data.is_remote,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      addToast({
        type: 'success',
        message: 'Job post updated successfully!',
      });

      navigate(`/jobs/${id}`);
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update job post',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-dark-300 rounded w-1/4 mb-8" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-dark-300 rounded" />
          <div className="h-12 bg-gray-200 dark:bg-dark-300 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-dark-300 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <h1 className="text-3xl font-bold">Edit Job Post</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-300"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8">
          {/* Position Info Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-primary-500" />
              Position Information
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Job Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full pl-10"
                    placeholder="e.g., Senior Frontend Developer"
                    {...register('title', { required: 'Job title is required' })}
                  />
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                {errors.title && (
                  <p className="mt-1 text-sm text-error-600">{errors.title.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Job Type
                  </label>
                  <div className="relative">
                    <select
                      className="w-full pl-10 appearance-none"
                      {...register('type', { required: 'Job type is required' })}
                    >
                      <option value="">Select job type</option>
                      <option value="full-time">Full Time</option>
                      <option value="part-time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                  {errors.type && (
                    <p className="mt-1 text-sm text-error-600">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Salary Range
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full pl-10"
                      placeholder="e.g., $100,000 - $150,000"
                      {...register('salary_range')}
                    />
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    {...register('is_remote')}
                  />
                  <span className="ml-2 flex items-center">
                    <Globe className="h-4 w-4 mr-1 text-primary-500" />
                    This is a remote position
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Company Info Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Building className="h-5 w-5 mr-2 text-primary-500" />
              Company Information
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Company Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full pl-10"
                    placeholder="Company name"
                    {...register('company', { required: 'Company is required' })}
                  />
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                {errors.company && (
                  <p className="mt-1 text-sm text-error-600">{errors.company.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full pl-10"
                    placeholder="e.g., San Francisco, CA"
                    {...register('location', { required: 'Location is required' })}
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                {errors.location && (
                  <p className="mt-1 text-sm text-error-600">{errors.location.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Job Details Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Job Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Job Description
                </label>
                <textarea
                  rows={6}
                  className="w-full"
                  placeholder="Describe the role and responsibilities"
                  {...register('description', { required: 'Description is required' })}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-error-600">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Requirements (one per line)
                </label>
                <textarea
                  rows={4}
                  className="w-full"
                  placeholder="- 5+ years of experience with React&#10;- Strong understanding of TypeScript&#10;- Experience with cloud platforms"
                  {...register('requirements', { required: 'Requirements are required' })}
                />
                {errors.requirements && (
                  <p className="mt-1 text-sm text-error-600">{errors.requirements.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tech Stack (comma separated)
                </label>
                <input
                  type="text"
                  className="w-full"
                  placeholder="e.g., React, TypeScript, Node.js"
                  {...register('tech_stack', { required: 'Tech stack is required' })}
                />
                {errors.tech_stack && (
                  <p className="mt-1 text-sm text-error-600">{errors.tech_stack.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Application Info Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Application Information</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Application URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    className="w-full pl-10"
                    placeholder="https://..."
                    {...register('apply_url', {
                      required: 'Application URL is required',
                      pattern: {
                        value: /^https?:\/\/.+/,
                        message: 'Please enter a valid URL',
                      },
                    })}
                  />
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                {errors.apply_url && (
                  <p className="mt-1 text-sm text-error-600">{errors.apply_url.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Application Deadline
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full pl-10"
                    min={new Date().toISOString().split('T')[0]}
                    {...register('deadline', { required: 'Deadline is required' })}
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                {errors.deadline && (
                  <p className="mt-1 text-sm text-error-600">{errors.deadline.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Updating...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Job Post
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditJobPage;