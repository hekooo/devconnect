import { SunIcon, MoonIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <motion.button
      className="p-2 rounded-full bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-400 transition-all"
      onClick={toggleTheme}
      whileTap={{ scale: 0.95 }}
    >
      {theme === 'light' ? (
        <SunIcon className="h-5 w-5 text-amber-500" />
      ) : (
        <MoonIcon className="h-5 w-5 text-primary-400" />
      )}
    </motion.button>
  );
};

export default ThemeToggle;