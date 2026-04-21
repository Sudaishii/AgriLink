import { useState, useCallback } from 'react';

interface UseLoadingReturn {
  isLoading: boolean;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  loadingMessage: string;
}

export const useLoading = (initialMessage: string = "Loading..."): UseLoadingReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(initialMessage);

  const startLoading = useCallback((message?: string) => {
    if (message) {
      setLoadingMessage(message);
    } else {
      setLoadingMessage(initialMessage);
    }
    setIsLoading(true);
  }, [initialMessage]);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    loadingMessage
  };
};

export default useLoading;
