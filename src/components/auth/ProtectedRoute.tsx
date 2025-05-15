// src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../contexts/UserProfileContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const location = useLocation();

  // Henüz auth veya profile yükleniyorsa spinner göster
  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Giriş yapılmamışsa login sayfasına yönlendir
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Eğer admin ise user panel yerine admin paneline yönlendir
  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Diğer tüm normal kullanıcılar için child component render et
  return <>{children}</>;
};

export default ProtectedRoute;
