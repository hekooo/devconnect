import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatBox from '../components/chat/ChatBox';

const MessagesPage: React.FC = () => {
  const { id: chatId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(!chatId || !isMobile);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // On desktop, always show sidebar
      if (!mobile) {
        setShowSidebar(true);
      } else if (chatId) {
        // On mobile with active chat, hide sidebar
        setShowSidebar(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chatId]);

  // Update sidebar visibility when chatId changes
  useEffect(() => {
    if (isMobile && chatId) {
      setShowSidebar(false);
    }
  }, [chatId, isMobile]);

  const handleCloseChatOnMobile = () => {
    if (isMobile) {
      navigate('/messages');
      setShowSidebar(true);
    }
  };

  const handleChatSelect = (selectedChatId: string) => {
    navigate(`/messages/${selectedChatId}`);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-gray-50 dark:bg-dark-100">
      {/* Sidebar - conditionally shown on mobile */}
      <AnimatePresence initial={false}>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? '100%' : 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="h-full flex-shrink-0 overflow-hidden bg-white dark:bg-dark-100 border-r border-gray-200 dark:border-dark-300"
          >
            <ChatSidebar onChatSelect={handleChatSelect} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {chatId ? (
          <ChatBox 
            chatId={chatId} 
            onClose={isMobile ? handleCloseChatOnMobile : undefined}
            isMobile={isMobile}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-100">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gray-200 dark:bg-dark-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3 className="text-lg font-medium mb-1">Your Messages</h3>
              <p className="max-w-xs">Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;