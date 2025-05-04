import React from 'react';
import { motion } from 'framer-motion';

interface LoadingIndicatorProps {
  message?: string;
  progress?: number;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Processing your request...',
  progress
}) => {
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-8 flex flex-col items-center">
      <div className="mb-4 relative">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-600"></div>
          </div>
        </motion.div>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {message}
      </h3>
      
      {progress !== undefined && (
        <div className="w-full mt-2 mb-4">
          <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 text-right">{progress}% complete</p>
        </div>
      )}
      
      <p className="text-sm text-gray-500 text-center">
        This might take a moment depending on the website size.
      </p>
    </div>
  );
};

export default LoadingIndicator;