import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ExplorePage from './pages/ExplorePage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';
import BlogFeedPage from './pages/feed/BlogFeedPage';
import QuestionFeedPage from './pages/feed/QuestionFeedPage';
import JobFeedPage from './pages/feed/JobFeedPage';
import CreateJobPage from './pages/jobs/CreateJobPage';
import EditJobPage from './pages/jobs/EditJobPage';
import JobDetailPage from './pages/jobs/JobDetailPage';
import AskQuestionPage from './pages/questions/AskQuestionPage';
import QuestionDetailPage from './pages/questions/QuestionDetailPage';
import StandardFeedPage from './pages/feed/StandardFeedPage';
import BlogDetailPage from './pages/blog/BlogDetailPage';
import BlogEditorPage from './pages/blog/BlogEditorPage';
import EditPostPage from './pages/posts/EditPostPage';
import PostDetailPage from './pages/posts/PostDetailPage';
import StoryViewer from './components/story/StoryViewer';
import GroupsPage from './pages/GroupsPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import ReelDetailPage from './pages/reels/ReelDetailPage';
import ReelEditPage from './pages/reels/ReelEditPage';
import BookmarksPage from './pages/BookmarksPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import Toast from './components/ui/Toast';
import { useToast } from './hooks/useToast';

function App() {
  const { user, isLoading } = useAuth();
  const { toasts } = useToast();

  // Apply dark mode class based on theme preference
  useEffect(() => {
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>;
  }

  return (
    <>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={!user ? <ForgotPasswordPage /> : <Navigate to="/" />} />
        </Route>

        {/* Main app routes */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/settings/*" element={<SettingsPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:id" element={<MessagesPage />} />
          
          {/* Feed routes */}
          <Route path="/feed" element={<StandardFeedPage />} />
          <Route path="/blogs" element={<BlogFeedPage />} />
          <Route path="/blogs/:id" element={<BlogDetailPage />} />
          <Route path="/blogs/new" element={<BlogEditorPage />} />
          <Route path="/blogs/edit/:id" element={<BlogEditorPage />} />
          <Route path="/questions" element={<QuestionFeedPage />} />
          <Route path="/questions/ask" element={<AskQuestionPage />} />
          <Route path="/questions/:id" element={<QuestionDetailPage />} />
          <Route path="/jobs" element={<JobFeedPage />} />
          <Route path="/jobs/post" element={<CreateJobPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/jobs/edit/:id" element={<EditJobPage />} />
          
          {/* Post routes */}
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/posts/edit/:id" element={<EditPostPage />} />
          
          {/* Story routes */}
          <Route path="/stories/:id" element={<StoryViewer />} />
          
          {/* Reels routes */}
          <Route path="/reels/:id" element={<ReelDetailPage />} />
          <Route path="/reels/edit/:id" element={<ReelEditPage />} />
          
          <Route path="/groups" element={<GroupsPage />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminRoute><MainLayout /></AdminRoute>}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </>
  );
}

export default App;