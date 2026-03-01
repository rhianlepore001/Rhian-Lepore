
import React, { createContext, useContext, useState } from 'react';

/**
 * UI context type for managing global UI state
 * Controls sidebar visibility, modal state, and responsive breakpoints
 * @interface UIContextType
 */
interface UIContextType {
  /** Whether sidebar is currently open */
  isSidebarOpen: boolean;

  /** Toggle sidebar visibility state */
  toggleSidebar: () => void;

  /** Close sidebar */
  closeSidebar: () => void;

  /** Whether a modal is currently open */
  isModalOpen: boolean;

  /** Set modal open/closed state */
  setModalOpen: (open: boolean) => void;

  /** Whether screen size is mobile (<768px) */
  isMobile: boolean;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

/**
 * UI context provider that manages global UI state
 * Handles sidebar, modal, and responsive state management
 * @component
 * @example
 * <UIProvider>
 *   <App />
 * </UIProvider>
 */
export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);
  const setModalOpen = (open: boolean) => setIsModalOpen(open);

  return (
    <UIContext.Provider value={{
      isSidebarOpen,
      toggleSidebar,
      closeSidebar,
      isModalOpen,
      setModalOpen,
      isMobile
    }}>
      {children}
    </UIContext.Provider>
  );
};

/**
 * Custom hook to access UI context
 * Must be used within a UIProvider
 * @returns {UIContextType} UI context with state management methods
 * @throws {Error} When used outside of UIProvider
 * @example
 * const { isSidebarOpen, toggleSidebar, isMobile } = useUI();
 */
export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
