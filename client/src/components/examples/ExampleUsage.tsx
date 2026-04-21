import React, { useState } from 'react';
import { useLoading } from '../../hooks/useLoading';
import LoadingOverlay from '../ui/LoadingOverlay';

// Example component showing how to use the loading spinner
const ExampleUsage: React.FC = () => {
  const { isLoading, startLoading, stopLoading, loadingMessage } = useLoading("Processing your request...");

  const handleAsyncOperation = async () => {
    startLoading("Fetching data...");
    
    // Simulate an async operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    stopLoading();
    console.log("Operation completed!");
  };

  const handleAnotherOperation = async () => {
    startLoading("Uploading file...");
    
    // Simulate file upload
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    stopLoading();
    console.log("Upload completed!");
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Loading Spinner Examples</h2>
      
      <div className="space-y-4">
        <button
          onClick={handleAsyncOperation}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Fetch Data (2s)
        </button>
        
        <button
          onClick={handleAnotherOperation}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Upload File (3s)
        </button>
      </div>

      {/* Global loading overlay */}
      <LoadingOverlay isLoading={isLoading} message={loadingMessage} />
    </div>
  );
};

export default ExampleUsage;
