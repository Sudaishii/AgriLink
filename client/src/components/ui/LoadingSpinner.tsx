import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Loading...", 
  fullScreen = true 
}) => {
  const spinnerContent = (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Main spinner container with logo */}
      <div className="relative">
        {/* Outer spinning circle */}
        <div className="absolute inset-0 w-24 h-24 border-4 border-[#5ba40920] rounded-full animate-spin"></div>
        
        {/* Inner spinning circle (counter-clockwise) */}
        <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-t-[#5ba409] border-b-[#5ba409] rounded-full animate-spin" 
             style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        
        {/* AgriLink logo in center */}
        <div className="relative z-10 w-24 h-24 flex items-center justify-center">
          <img 
            src="/src/assets/logo/AgriLinkGREEN.png" 
            alt="AgriLink Logo" 
            className="w-14 h-14 object-contain"
          />
        </div>
      </div>
      
      {/* Secondary decorative elements */}
      <div className="flex space-x-2">
        <div className="w-2 h-2 bg-[#5ba40980] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-[#5ba409] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-[#5ba409] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      
      {/* Loading message */}
      <div className="text-center">
        <p className="text-gray-600 font-medium animate-pulse">{message}</p>
      </div>
      
      {/* Progress indicator */}
      {/* <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#5ba40980] to-[#5ba409] rounded-full animate-pulse" 
             style={{ 
               animation: 'shimmer 2s infinite',
               backgroundSize: '200% 100%'
             }}>
        </div>
      </div> */}
    </div>
  );

  const containerClasses = fullScreen 
    ? "fixed inset-0 bg-white bg-opacity-95 backdrop-blur-sm z-50 flex items-center justify-center"
    : "flex items-center justify-center p-8";

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
      <div className={containerClasses}>
        {spinnerContent}
      </div>
    </>
  );
};

export default LoadingSpinner;
