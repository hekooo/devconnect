
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, User, FileText, HelpCircle, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '../../hooks/useDebounce';
import supabase from '../../lib/supabase';

interface SearchResult {
  type: 'user' | 'post' | 'question' | 'tag';
  id: string;
  title?: string;
  username?: string;
  avatar_url?: string;
  name?: string;
  preview?: string;
}

const SearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async () => {
    if (!debouncedQuery.trim()) return;

    setIsLoading(true);
    try {
      const [usersResponse, postsResponse, questionsResponse, tagsResponse] = await Promise.all([
        // Search users
        supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .ilike('username', `%${debouncedQuery}%`)
          .limit(3),

        // Search posts
        supabase
          .from('posts')
          .select('id, title, content')
          .or(`title.ilike.%${debouncedQuery}%,content.ilike.%${debouncedQuery}%`)
          .limit(3),

        // Search questions
        supabase
          .from('questions')
          .select('id, title')
          .ilike('title', `%${debouncedQuery}%`)
          .limit(3),

        // Search tags
        supabase
          .from('tags')
          .select('id, name')
          .ilike('name', `%${debouncedQuery}%`)
          .limit(3),
      ]);

      const combinedResults: SearchResult[] = [
        ...(usersResponse.data || []).map(user => ({
          type: 'user' as const,
          id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          preview: user.full_name,
        })),
        ...(postsResponse.data || []).map(post => ({
          type: 'post' as const,
          id: post.id,
          title: post.title || post.content.substring(0, 60) + '...',
        })),
        ...(questionsResponse.data || []).map(question => ({
          type: 'question' as const,
          id: question.id,
          title: question.title,
        })),
        ...(tagsResponse.data || []).map(tag => ({
          type: 'tag' as const,
          id: tag.id,
          name: tag.name,
        })),
      ];

      setResults(combinedResults);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'user':
        navigate(`/profile/${result.id}`);
        break;
      case 'post':
        navigate(`/post/${result.id}`);
        break;
      case 'question':
        navigate(`/questions/${result.id}`);
        break;
      case 'tag':
        navigate(`/search?tag=${result.name}`);
        break;
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'post':
        return <FileText className="h-4 w-4" />;
      case 'question':
        return <HelpCircle className="h-4 w-4" />;
      case 'tag':
        return <Hash className="h-4 w-4" />;
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2"
          />
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {isOpen && (query || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-200 rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 overflow-hidden z-50"
          >
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-dark-300 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-dark-300 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-dark-300">
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {result.type === 'user' && result.avatar_url ? (
                        <img
                          src={result.avatar_url}
                          alt={result.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-300 flex items-center justify-center">
                          {getResultIcon(result.type)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {result.username || result.title || result.name}
                        </div>
                        {result.preview && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {result.preview}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                <div className="p-3 text-center">
                  <button
                    onClick={handleSearch}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    View all results
                  </button>
                </div>
              </div>
            ) : query ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <SearchIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
