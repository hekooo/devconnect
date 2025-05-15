import { useAuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useAuthContext();

  return {
    user: context.user,
    session: context.session,
    isLoading: context.isLoading,
    signIn: context.signIn,
    signUp: context.signUp,
    signOut: context.signOut,
    resetPassword: context.resetPassword,
  };
}