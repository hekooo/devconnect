import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import QuestionCard from '../../components/question/QuestionCard';
import { useAuth } from '../../hooks/useAuth';
import supabase from '../../lib/supabase';

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
  }[];
}

interface Tag {
  id: string;
  name: string;
  _count?: {
    questions: number;
  };
}

type SortOption = 'newest' | 'most_answered' | 'unanswered';

const QuestionFeedPage = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const ITEMS_PER_PAGE = 10;

  // Fetch following IDs
  useEffect(() => {
    if (user) {
      fetchFollowingIds();
      fetchTags();
    }
  }, [user]);

  // Fetch questions when dependencies change
  useEffect(() => {
    if (user && followingIds.length >= 0) {
      fetchQuestions();
    }
  }, [sortBy, searchQuery, selectedTag, page, followingIds]);

  const fetchFollowingIds = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id);

      if (error) throw error;
      
      const ids = data?.map(item => item.following_id) || [];
      setFollowingIds(ids);
    } catch (error) {
      console.error('Error fetching following IDs:', error);
    }
  };

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      // If user is not following anyone, show empty state
      if (followingIds.length === 0) {
        setQuestions([]);
        setHasMore(false);
        return;
      }

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
            tag:tags!inner(id, name)
          ),
          answers!answers_question_id_fkey(count),
          votes(count)
        `)
        .in('user_id', followingIds)
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%`);
      }

      // Apply tag filter
      if (selectedTag) {
        query = query.eq('content_tags.tag.name', selectedTag);
      }

      // Always order by created_at first
      query = query.order('created_at', { ascending: false });

      const { data } = await query;

      if (!data) {
        setQuestions([]);
        setHasMore(false);
        return;
      }

      // Transform and process the data
      const transformedQuestions = data.map((q: any) => {
        return {
          id: q.id,
          title: q.title,
          body: q.body,
          created_at: q.created_at,
          is_solved: q.is_solved,
          user: q.user,
          tags: q.content_tags.map((ct: any) => ct.tag),
          _count: {
            answers: q.answers?.[0]?.count || 0,
            votes: q.votes?.[0]?.count || 0,
          },
        };
      });

      // Apply client-side sorting
      let sortedQuestions = [...transformedQuestions];
      
      switch (sortBy) {
        case 'most_answered':
          sortedQuestions.sort((a, b) => b._count.answers - a._count.answers);
          break;
        case 'unanswered':
          sortedQuestions = sortedQuestions.filter(q => q._count.answers === 0);
          break;
        // 'newest' is already handled by the query's order
      }

      if (page === 1) {
        setQuestions(sortedQuestions);
      } else {
        setQuestions(prev => [...prev, ...sortedQuestions]);
      }

      setHasMore(sortedQuestions.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const { data: contentTags } = await supabase
        .from('content_tags')
        .select('tag_id');

      const tagCounts = contentTags?.reduce((acc: Record<string, number>, curr) => {
        acc[curr.tag_id] = (acc[curr.tag_id] || 0) + 1;
        return acc;
      }, {});

      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      
      const transformed = (data || []).map(tag => ({
        id: tag.id,
        name: tag.name,
        _count: {
          questions: tagCounts?.[tag.id] || 0,
        },
      }));

      setTags(transformed);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const loadMore = () => {
    if (hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const clearTagFilter = () => {
    setSelectedTag(null);
    setPage(1);
  };

  return (
    <div className="max-w-5xl mx-auto px-4">
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
          {/* Search and filters */}
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
              <button
                onClick={() => setSortBy('newest')}
                className={`px-3 py-1 rounded-full text-sm ${
                  sortBy === 'newest'
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortBy('most_answered')}
                className={`px-3 py-1 rounded-full text-sm ${
                  sortBy === 'most_answered'
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                Most Answered
              </button>
              <button
                onClick={() => setSortBy('unanswered')}
                className={`px-3 py-1 rounded-full text-sm ${
                  sortBy === 'unanswered'
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-300'
                }`}
              >
                Unanswered
              </button>
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
          {isLoading && page === 1 ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-dark-200 rounded-xl p-6 animate-pulse"
                >
                  <div className="h-6 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-full" />
                    <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : followingIds.length === 0 ? (
            <div className="bg-white dark:bg-dark-200 rounded-xl p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold mb-2">Your feed is empty</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Follow some users to see their questions in your feed
              </p>
              <Link 
                to="/explore" 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Discover users to follow
              </Link>
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white dark:bg-dark-200 rounded-xl p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold mb-2">No questions found</h2>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? `No questions match "${searchQuery}"`
                  : selectedTag
                  ? `No questions found with tag "${selectedTag}"`
                  : "Users you follow haven't asked any questions yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {questions.map((question, idx) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <QuestionCard question={question} preview />
                  </motion.div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button 
                    onClick={loadMore} 
                    className="btn-outline"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
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
                  onClick={() => {
                    setSelectedTag(tag.name);
                    setPage(1);
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTag === tag.name
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

export default QuestionFeedPage;