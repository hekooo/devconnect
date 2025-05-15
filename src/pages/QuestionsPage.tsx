import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import QuestionCard from '../components/question/QuestionCard';
import supabase from '../lib/supabase';

interface Question {
  id: string;
  title: string;
  body: string;
  created_at: string;
  is_solved: boolean;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  _count: {
    answers: number;
    votes: number;
  };
  tags: {
    name: string;
    slug: string;
  }[];
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  _count?: {
    questions: number;
  };
}

type SortOption = 'newest' | 'most_answered' | 'unanswered';

const QuestionsPage = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
    fetchTags();
  }, [sortBy, searchQuery, selectedTag]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('questions')
        .select(`
          id,
          title,
          body,
          created_at,
          is_solved,
          user:profiles!questions_user_id_fkey(id, username, avatar_url),
          content_tags!inner(
            tag:tags!inner(id, name, slug)
          ),
          answers:answers(count),
          votes(count)
        `);

      // Apply sorting
      if (sortBy === 'most_answered') {
        query = query.order('answers_count', { ascending: false });
      } else if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'unanswered') {
        query = query.eq('answers_count', 0).order('created_at', { ascending: false });
      }

      // Apply tag filter if selected
      if (selectedTag) {
        query = query.eq('content_tags.tag.slug', selectedTag);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our Question interface
      const transformed = (data || []).map((q: any) => ({
        id: q.id,
        title: q.title,
        body: q.body,
        created_at: q.created_at,
        is_solved: q.is_solved,
        user: q.user,
        tags: q.content_tags.map((ct: any) => ct.tag),
        _count: {
          answers: q.answers[0]?.count || 0,
          votes: q.votes[0]?.count || 0,
        },
      }));

      // Apply search filter in JS
      const filtered = transformed.filter(q => {
        const matchesSearch =
          !searchQuery ||
          q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.body.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });

      setQuestions(filtered);
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select(`
          id,
          name,
          slug,
          content_tags(count)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match our Tag interface
      const transformed = (data || []).map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        _count: {
          questions: tag.content_tags[0]?.count || 0,
        },
      }));

      setTags(transformed);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const clearTagFilter = () => {
    setSelectedTag(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Questions</h1>
        <Link to="/questions/ask" className="btn-primary">
          <PlusCircle className="h-5 w-5 mr-2" />
          Ask Question
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1">
          {/* Search & Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              {(['newest', 'most_answered', 'unanswered'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    sortBy === option
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                  }`}
                >
                  {option === 'newest'
                    ? 'Newest'
                    : option === 'most_answered'
                    ? 'Most Answered'
                    : 'Unanswered'}
                </button>
              ))}
              {selectedTag && (
                <button
                  onClick={clearTagFilter}
                  className="px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-dark-300 hover:bg-gray-200 dark:hover:bg-dark-400"
                >
                  Clear tag filter
                </button>
              )}
            </div>
          </div>

          {/* Questions list */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-dark-200 rounded-xl p-6 animate-pulse"
                >
                  <div className="h-6 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-full mb-1" />
                  <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-5/6" />
                </div>
              ))}
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white dark:bg-dark-200 rounded-xl p-12 text-center">
              <h2 className="text-xl font-semibold mb-2">No questions found</h2>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? `No questions match "${searchQuery}"`
                  : selectedTag
                  ? `No questions found with tag "${selectedTag}"`
                  : 'Be the first to ask a question!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <QuestionCard question={q} preview />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-72">
          <div className="bg-white dark:bg-dark-200 rounded-xl p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Popular Tags</h3>
            <div className="space-y-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(tag.slug)}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTag === tag.slug
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                  }`}
                >
                  <span className="font-medium">#{tag.name}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({tag._count?.questions || 0})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionsPage;