import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, CheckCircle, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import VoteButton from '../../components/question/VoteButton';
import AnswerCard from '../../components/question/AnswerCard';
import supabase from '../../lib/supabase';

interface Question {
  id: string;
  title: string;
  body: string;
  body_html: string;
  created_at: string;
  is_solved: boolean;
  accepted_answer_id: string | null;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  tags: {
    name: string;
  }[];
  _count: {
    answers: number;
    votes: number;
  };
}

interface Answer {
  id: string;
  body: string;
  body_html: string;
  is_accepted: boolean;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  _count: {
    votes: number;
  };
}

interface EditModalProps {
  title: string;
  content: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ title, content, onSave, onClose }) => {
  const [editedContent, setEditedContent] = useState(content);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-dark-200 rounded-xl p-6 max-w-2xl w-full"
      >
        <h2 className="text-xl font-semibold mb-4">Edit {title}</h2>
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full h-64 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedContent)}
            className="btn-primary"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const QuestionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuestionActions, setShowQuestionActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchQuestion();
      fetchAnswers();
    }
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          title,
          body,
          body_html,
          created_at,
          is_solved,
          accepted_answer_id,
          user:profiles!questions_user_id_fkey(
            id,
            username,
            avatar_url
          ),
          content_tags!inner(
            tag:tags!inner(
              name
            )
          ),
          answers:answers_question_id_fkey(count),
          votes(count)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const transformedQuestion = {
        ...data,
        tags: data.content_tags.map((ct: any) => ct.tag),
        _count: {
          answers: data.answers[0]?.count || 0,
          votes: data.votes[0]?.count || 0,
        },
      };

      setQuestion(transformedQuestion);
    } catch (error) {
      console.error('Error fetching question:', error);
      addToast({
        type: 'error',
        message: 'Failed to load question',
      });
      navigate('/questions');
    }
  };

  const fetchAnswers = async () => {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          id,
          body,
          body_html,
          is_accepted,
          created_at,
          user:profiles!answers_user_id_fkey(
            id,
            username,
            avatar_url
          ),
          votes(count)
        `)
        .eq('question_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const transformedAnswers = data.map((answer: any) => ({
        ...answer,
        _count: {
          votes: answer.votes[0]?.count || 0,
        },
      }));

      setAnswers(transformedAnswers);
    } catch (error) {
      console.error('Error fetching answers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAnswer.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: answer, error } = await supabase
        .from('answers')
        .insert({
          question_id: id,
          user_id: user.id,
          body: newAnswer,
          body_html: newAnswer,
        })
        .select(`
          id,
          body,
          body_html,
          is_accepted,
          created_at,
          user:profiles!answers_user_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      setAnswers([...answers, { ...answer, _count: { votes: 0 } }]);
      setNewAnswer('');
      addToast({
        type: 'success',
        message: 'Answer posted successfully!',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to post answer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!user || !question || user.id !== question.user.id) return;

    try {
      const { error: answerError } = await supabase
        .from('answers')
        .update({ is_accepted: true })
        .eq('id', answerId);

      if (answerError) throw answerError;

      const { error: questionError } = await supabase
        .from('questions')
        .update({
          is_solved: true,
          accepted_answer_id: answerId,
        })
        .eq('id', id);

      if (questionError) throw questionError;

      setQuestion(prev => prev ? { ...prev, is_solved: true, accepted_answer_id: answerId } : null);
      setAnswers(prev =>
        prev.map(a => ({
          ...a,
          is_accepted: a.id === answerId,
        }))
      );

      addToast({
        type: 'success',
        message: 'Answer marked as accepted!',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to accept answer',
      });
    }
  };

  const handleEditQuestion = async (newContent: string) => {
    if (!user || !question || user.id !== question.user.id) return;

    try {
      const { error } = await supabase
        .from('questions')
        .update({
          body: newContent,
          body_html: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', question.id);

      if (error) throw error;

      setQuestion(prev => prev ? { ...prev, body: newContent, body_html: newContent } : null);
      setIsEditing(false);
      addToast({
        type: 'success',
        message: 'Question updated successfully!',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to update question',
      });
    }
  };

  const handleDeleteQuestion = async () => {
    if (!user || !question || user.id !== question.user.id) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', question.id);

      if (error) throw error;

      addToast({
        type: 'success',
        message: 'Question deleted successfully!',
      });
      navigate('/questions');
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to delete question',
      });
    }
  };

  const handleEditAnswer = async (answerId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('answers')
        .update({
          body: newContent,
          body_html: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', answerId);

      if (error) throw error;

      setAnswers(prev =>
        prev.map(a =>
          a.id === answerId
            ? { ...a, body: newContent, body_html: newContent }
            : a
        )
      );
      setEditingAnswer(null);
      addToast({
        type: 'success',
        message: 'Answer updated successfully!',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to update answer',
      });
    }
  };

  const handleDeleteAnswer = async (answerId: string) => {
    try {
      const { error } = await supabase
        .from('answers')
        .delete()
        .eq('id', answerId);

      if (error) throw error;

      setAnswers(prev => prev.filter(a => a.id !== answerId));
      addToast({
        type: 'success',
        message: 'Answer deleted successfully!',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to delete answer',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-dark-300 rounded w-1/4 mb-8" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-dark-300 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-dark-300 rounded" />
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">Question not found</h2>
        <Link
          to="/questions"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          <ArrowLeft className="h-5 w-5 inline mr-2" />
          Back to questions
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="mb-8">
        <Link
          to="/questions"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to questions
        </Link>

        <div className="flex gap-6">
          <div className="flex flex-col items-center">
            <VoteButton
              contentId={question.id}
              contentType="question"
              initialCount={question._count.votes}
            />
            {question.is_solved && (
              <div className="mt-2 flex items-center gap-1 text-success-600 dark:text-success-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Solved</span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">{question.title}</h1>
              {user?.id === question.user.id && (
                <div className="relative">
                  <button
                    onClick={() => setShowQuestionActions(!showQuestionActions)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-full"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  <AnimatePresence>
                    {showQuestionActions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-200 rounded-md shadow-lg z-10"
                      >
                        <button
                          onClick={() => {
                            setShowQuestionActions(false);
                            setIsEditing(true);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-300"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit Question
                        </button>
                        <button
                          onClick={() => {
                            setShowQuestionActions(false);
                            setShowDeleteConfirm(true);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error-600 hover:bg-gray-100 dark:hover:bg-dark-300"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Question
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {question.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-sm"
                >
                  #{tag.name}
                </span>
              ))}
            </div>

            <div className="prose dark:prose-invert max-w-none mb-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {question.body}
              </ReactMarkdown>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <img
                  src={question.user.avatar_url}
                  alt={question.user.username}
                  className="h-8 w-8 rounded-full"
                />
                <span>
                  Asked by{' '}
                  <Link
                    to={`/profile/${question.user.id}`}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {question.user.username}
                  </Link>
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{question._count.answers} answers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">
          {question._count.answers} {question._count.answers === 1 ? 'Answer' : 'Answers'}
        </h2>

        {answers.map((answer) => (
          <AnswerCard
            key={answer.id}
            answer={answer}
            questionId={question.id}
            questionUserId={question.user.id}
            onAcceptAnswer={() => handleAcceptAnswer(answer.id)}
            onEdit={() => setEditingAnswer(answer.id)}
            onDelete={() => handleDeleteAnswer(answer.id)}
          />
        ))}

        {user && (
          <div className="bg-white dark:bg-dark-200 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Your Answer</h3>
            <form onSubmit={handleSubmitAnswer}>
              <textarea
                rows={6}
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Write your answer here..."
                className="w-full mb-4"
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || !newAnswer.trim()}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Posting...
                  </div>
                ) : (
                  'Post Answer'
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isEditing && (
          <EditModal
            title="Question"
            content={question.body}
            onSave={handleEditQuestion}
            onClose={() => setIsEditing(false)}
          />
        )}

        {editingAnswer && (
          <EditModal
            title="Answer"
            content={answers.find(a => a.id === editingAnswer)?.body || ''}
            onSave={(content) => handleEditAnswer(editingAnswer, content)}
            onClose={() => setEditingAnswer(null)}
          />
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Delete Question</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteQuestion}
                  className="px-4 py-2 text-sm font-medium text-white bg-error-600 hover:bg-error-700 rounded-md"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestionDetailPage;