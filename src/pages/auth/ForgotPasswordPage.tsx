import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

interface ForgotPasswordFormValues {
  email: string;
}

const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>();

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await resetPassword(data.email);
      
      if (error) {
        throw error;
      }
      
      setIsSuccess(true);
      addToast({
        type: 'success',
        message: 'Password reset email sent!',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send reset email',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Link to="/login" className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to login
      </Link>

      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Reset your password</h2>
        <p className="text-gray-600 dark:text-gray-400">
          We'll send you an email with a link to reset your password
        </p>
      </div>

      {isSuccess ? (
        <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-4 text-success-800 dark:text-success-200">
          <h3 className="font-medium mb-1">Check your email</h3>
          <p className="text-sm">
            We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
          </p>
          <Link 
            to="/login" 
            className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Return to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`w-full ${errors.email ? 'border-error-500 focus:ring-error-500' : ''}`}
              placeholder="you@example.com"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: 'Invalid email address',
                },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Sending reset link...
              </div>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
};

export default ForgotPasswordPage;