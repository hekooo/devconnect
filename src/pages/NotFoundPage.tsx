import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Code } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg"
      >
        <div className="flex justify-center mb-6">
          <Code className="h-16 w-16 text-primary-600 dark:text-primary-500" />
        </div>
        
        <h1 className="text-5xl font-bold mb-4 text-gray-800 dark:text-white">404</h1>
        <h2 className="text-2xl font-semibold mb-2 text-gray-700 dark:text-gray-200">Page Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return Home
          </Link>
        </div>
      </motion.div>

      <div className="mt-auto text-center text-sm text-gray-500 dark:text-gray-400 py-4">
        &copy; {new Date().getFullYear()} DevConnect. All rights reserved.
      </div>
    </div>
  );
};

export default NotFoundPage;