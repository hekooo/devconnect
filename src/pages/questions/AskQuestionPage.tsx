import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import supabase from '../../lib/supabase';

interface QuestionFormData {
  title: string;
  body: string;
  tags: string;
}

const AskQuestionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuestionFormData>();

  const onSubmit = async (data: QuestionFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Create the question
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          user_id: user.id,
          title: data.title,
          body: data.body,
          body_html: data.body, // You might want to process markdown here
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Create tags if provided
      if (data.tags) {
        const tagNames = data.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        
        if (tagNames.length > 0) {
          // First check for existing tags
          const { data: existingTags } = await supabase
            .from('tags')
            .select('id, name')
            .in('name', tagNames);

          const existingTagNames = new Set(existingTags?.map(tag => tag.name) || []);
          const newTagNames = tagNames.filter(name => !existingTagNames.has(name));

          // Create new tags
          let allTags = existingTags || [];
          if (newTagNames.length > 0) {
            const { data: newTags, error: newTagsError } = await supabase
              .from('tags')
              .insert(newTagNames.map(name => ({ name })))
              .select('id, name');

            if (newTagsError) throw newTagsError;
            if (newTags) {
              allTags = [...allTags, ...newTags];
            }
          }

          // Create content-tag relationships
          const { error: contentTagError } = await supabase
            .from('content_tags')
            .insert(
              allTags.map(tag => ({
                tag_id: tag.id,
                question_id: question.id,
              }))
            );

          if (contentTagError) throw contentTagError;
        }
      }

      addToast({
        type: 'success',
        message: 'Question posted successfully!',
      });

      navigate(`/questions/${question.id}`);
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to post question',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-3xl font-bold">Ask a Question</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-200 rounded-xl p-6"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Title
            </label>
            <input
              type="text"
              className="w-full"
              placeholder="What's your programming question? Be specific."
              {...register('title', {
                required: 'Title is required',
                minLength: {
                  value: 15,
                  message: 'Title should be at least 15 characters',
                },
              })}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-error-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Body
            </label>
            <textarea
              rows={12}
              className="w-full font-mono"
              placeholder="Describe your problem in detail. Include your code, what you've tried, and what you're trying to achieve."
              {...register('body', {
                required: 'Question details are required',
                minLength: {
                  value: 30,
                  message: 'Please provide more details about your question',
                },
              })}
            />
            {errors.body && (
              <p className="mt-1 text-sm text-error-600">{errors.body.message}</p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Tip: You can use Markdown to format your question
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tags
            </label>
            <input
              type="text"
              className="w-full"
              placeholder="e.g., javascript, react, node.js"
              {...register('tags', {
                pattern: {
                  value: /^[a-zA-Z0-9\s,\-+#.]+$/,
                  message: 'Tags can only contain letters, numbers, and basic punctuation',
                },
              })}
            />
            {errors.tags && (
              <p className="mt-1 text-sm text-error-600">{errors.tags.message}</p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Add up to 5 tags to describe what your question is about
            </p>
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
                  Posting...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Post Question
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AskQuestionPage;