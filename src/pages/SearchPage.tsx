```typescript
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, FileText, HelpCircle, Hash, Search as SearchIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import SearchBar from '../components/search/SearchBar';
import supabase from '../lib/supabase';

type SearchResultType = 'all' | 'users' | 'posts' | 'questions' | 'tags';

interface SearchResult {
  type: 'user' | 'post' | 'question' | 'tag';
  id: string;
  title?: string;
  content?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  name?: string;
  created_at: string;
  _count?: {
    followers?: number;
    likes?: number;
    answers?: number;
    posts?: number;
  };
}

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const tag = searchParams.get('tag');
  
  const [activeType, setActiveType] = useState<SearchResultType>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trendingUsers, setTrendingUsers] = useState<SearchResult[]>([]);
  const [trendingTags, setTrendingTags] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (query || tag) {
      performSearch();
    }
    fetchTrendingData();
  }, [query, tag, activeType]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const searchTerm = tag || query;
      let searchResults: SearchResult[] = [];

      if (activeType === 'all' || activeType === 'users') {
        const { data: users } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            full_name,
            avatar_url,
            created_at,
            _count {
              followers: follows_following_id_fkey(count)
            }
          `)
          .ilike('username', `%${searchTerm}%`)
          .limit(activeType === 'all' ? 3 : 20);

        if (users) {
          searchResults.push(...users.map(user => ({ ...user, type: 'user' as const })));
        }
      }

      if (activeType === 'all' || activeType === 'posts') {
        const { data: posts } = await supabase
          .from('posts')
          .select(`
            id,
            title,
            content,
            created_at,
            _count {
              likes(count)
            }
          `)
          .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
          .limit(activeType === 'all' ? 3 : 20);

        if (posts) {
          searchResults.push(...posts.map(post => ({ ...post, type: 'post' as const })));
        }
      }

      if (activeType === 'all' || activeType === 'questions') {
        const { data: questions } = await supabase
          .from('questions')
          .select(`
            id,
            title,
            created_at,
            _count {
              answers(count)
            }
          `)
          .ilike('title', `%${searchTerm}%`)
          .limit(activeType === 'all' ? 3 : 20);

        if (questions) {
          searchResults.push(...questions.map(question => ({ ...question, type: 'question' as const })));
        }
      }

      if (activeType === 'all' || activeType === 'tags') {
        const { data: tags } = await supabase
          .from('tags')
          .select(`
            id,
            name,
            created_at,
            _count {
              posts: content_tags(count)
            }
          `)
          .ilike('name', `%${searchTerm}%`)
          .limit(activeType === 'all' ? 3 : 20);

        if (tags) {
          searchResults.push(...tags.map(tag => ({ ...tag, type: 'tag' as const })));
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrendingData = async () => {
    try {
      // Fetch trending users (based on follower count)
      const { data: users } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          created_at,
          _count {
            followers: follows_following_id_fkey(count)
          }
        `)
        .order('_count->followers', { ascending: false })
        .limit(5);

      if (users) {
        setTrendingUsers(users.map(user => ({ ...user, type: 'user' as const })));
      }

      // Fetch trending tags (based on usage count)
      const { data: tags } = await supabase
        .from('tags')
        .select(`
          id,
          name,
          created_at,
          _count {
            posts: content_tags(count)
          }
        `)
        .order('_count->posts', { ascending: false })
        .limit(10);

      if (tags) {
        setTrendingTags(tags.map(tag => ({ ...tag, type: 'tag' as const })));
      }
    } catch (error) {
      console.error('Error fetching trending data:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">
          {tag ? `Posts tagged with "${tag}"` : 'Search'}
        </h1>
        <div className="max-w-2xl">
          <SearchBar />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1">
          {query || tag ? (
            <>
              {/* Result type filters */}
              <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-dark-300">
                {(['all', 'users', 'posts', 'questions', 'tags'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeType === type
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    {activeType === type && (
                      <motion.div
                        layoutId="searchFilterIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Search results */}
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-dark-200 rounded-xl p-6 animate-pulse"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-dark-300 rounded-full" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-dark-300 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="bg-white dark:bg-dark-200 rounded-xl p-12 text-center">
                  <SearchIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h2 className="text-xl font-semibold mb-2">No results found</h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try adjusting your search or filter to find what you're looking for
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <motion.div
                      key={`${result.type}-${result.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white dark:bg-dark-200 rounded-xl p-6"
                    >
                      {/* Result content based on type */}
                      {result.type === 'user' && (
                        <div className="flex items-center gap-4">
                          <img
                            src={result.avatar_url}
                            alt={result.username}
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <h3 className="font-medium">{result.full_name}</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                              @{result.username}
                            </p>
                            {result._count?.followers && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {result._count.followers} followers
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {result.type === 'post' && (
                        <div>
                          <h3 className="font-medium mb-2">{result.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                            {result.content}
                          </p>
                          {result._count?.likes && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                              {result._count.likes} likes
                            </p>
                          )}
                        </div>
                      )}

                      {result.type === 'question' && (
                        <div>
                          <h3 className="font-medium mb-2">{result.title}</h3>
                          {result._count?.answers && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {result._count.answers} answers
                            </p>
                          )}
                        </div>
                      )}

                      {result.type === 'tag' && (
                        <div className="flex items-center gap-2">
                          <div className="bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full text-sm">
                            #{result.name}
                          </div>
                          {result._count?.posts && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {result._count.posts} posts
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-dark-200 rounded-xl p-12 text-center">
              <SearchIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">Search for anything</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Find users, posts, questions, or tags
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-80">
          {/* Trending users */}
          <div className="bg-white dark:bg-dark-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Trending Developers</h3>
            <div className="space-y-4">
              {trendingUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      @{user.username}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending tags */}
          <div className="bg-white dark:bg-dark-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Trending Tags</h3>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((tag) => (
                <div
                  key={tag.id}
                  className="bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full text-sm"
                >
                  #{tag.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
```