import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

interface RouteTransitionProps {
  children: React.ReactNode;
}

const RouteTransition: React.FC<RouteTransitionProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [previousLocation, setPreviousLocation] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    // Show loading spinner when route changes
    if (previousLocation && previousLocation !== location.pathname) {
      setIsLoading(true);
      
      // Simulate loading time (adjust as needed)
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 250); // Snappier 250ms delay

      return () => clearTimeout(timer);
    }
    
    setPreviousLocation(location.pathname);
  }, [location.pathname, previousLocation]);

  // Don't show loading on initial load
  return (
    <div className="relative min-h-full">
      {isLoading && previousLocation && (
        <div className="absolute inset-0 z-[60] bg-white/40 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in duration-300">
          <LoadingSpinner message="Refining view..." />
        </div>
      )}
      <div className={`${isLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
        {children}
      </div>
    </div>
  );
};

export default RouteTransition;
