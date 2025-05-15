import { Outlet } from 'react-router-dom';
import { Code, WifiIcon, PenToolIcon, MessagesSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ui/ThemeToggle';

const AuthLayout = () => {
  return (
    <div className="flex min-h-screen">
      {/* Branding side */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-800 to-primary-600 text-white p-8 flex-col">
        <div className="flex items-center gap-2 mb-12">
          <Code className="h-8 w-8" />
          <h1 className="text-2xl font-bold">DevConnect</h1>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto">
          <motion.h2 
            className="text-4xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            The social platform built for developers
          </motion.h2>
          
          <p className="text-lg text-white/80 mb-8">
            Connect with fellow developers, share your knowledge, ask questions, and build your professional network.
          </p>

          <div className="space-y-6">
            <motion.div 
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <WifiIcon className="h-6 w-6 mt-1 text-accent-300" />
              <div>
                <h3 className="font-semibold text-lg">Professional networking</h3>
                <p className="text-white/70">Build meaningful connections with developers worldwide</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <PenToolIcon className="h-6 w-6 mt-1 text-accent-300" />
              <div>
                <h3 className="font-semibold text-lg">Share your knowledge</h3>
                <p className="text-white/70">Create blog posts, snippets, and tutorials</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <MessagesSquare className="h-6 w-6 mt-1 text-accent-300" />
              <div>
                <h3 className="font-semibold text-lg">Get expert answers</h3>
                <p className="text-white/70">Ask questions and receive help from the community</p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-auto text-sm text-white/60">
          &copy; {new Date().getFullYear()} DevConnect. All rights reserved.
        </div>
      </div>

      {/* Auth form side */}
      <div className="w-full lg:w-1/2 p-6 md:p-12 flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Code className="h-6 w-6 text-primary-600" />
            <h1 className="text-xl font-bold">DevConnect</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;