import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { XIcon, CheckCircleIcon, AlertCircleIcon, InfoIcon, AlertTriangleIcon } from 'lucide-react';
import { useToast, Toast as ToastType } from '../../hooks/useToast';

const Toast: React.FC<ToastType> = ({ id, message, type }) => {
  const { removeToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [id, removeToast]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'error':
        return <AlertCircleIcon className="h-5 w-5 text-error-500" />;
      case 'warning':
        return <AlertTriangleIcon className="h-5 w-5 text-warning-500" />;
      case 'info':
        return <InfoIcon className="h-5 w-5 text-primary-500" />;
      default:
        return null;
    }
  };

  const getToastClasses = () => {
    const baseClasses = "p-4 rounded-lg shadow-md flex items-center gap-3 min-w-80 max-w-md";
    
    switch (type) {
      case 'success':
        return `${baseClasses} bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-700`;
      case 'error':
        return `${baseClasses} bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-700`;
      case 'warning':
        return `${baseClasses} bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700`;
      case 'info':
        return `${baseClasses} bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700`;
      default:
        return baseClasses;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={getToastClasses()}
    >
      {getIcon()}
      <span className="flex-1">{message}</span>
      <button 
        onClick={() => removeToast(id)} 
        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

export default Toast;