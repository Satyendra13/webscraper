import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { queryWebsite } from '../services/api';

interface QueryInterfaceProps {
  websiteId: string;
}

const QueryInterface: React.FC<QueryInterfaceProps> = ({ websiteId }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setResult(null);
    
    try {
      const response = await queryWebsite(websiteId, query);
      setResult(response.data.result);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred while processing your query. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQueries = [
    "What is the main topic of this page?",
    "What are the most mentioned keywords?",
    "Summarize the content in 3 sentences.",
    "Is there any information about pricing?"
  ];

  const handleSampleQuery = (q: string) => {
    setQuery(q);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Ask about this content</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex rounded-md shadow-sm">
          <div className="relative flex-grow focus-within:z-10">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about this website..."
              className={`block w-full rounded-l-md border-0 py-3 pl-4 pr-12 text-gray-900 ring-1 ring-inset ${
                error ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300 focus:ring-purple-600'
              } focus:outline-none focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              isLoading
                ? 'bg-purple-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
            }`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Ask
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </form>
      
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Try these sample questions:</h3>
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((q, index) => (
            <button
              key={index}
              onClick={() => handleSampleQuery(q)}
              className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-800 hover:bg-purple-100 hover:text-purple-800 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 border rounded-md bg-purple-50 border-purple-100"
        >
          <h3 className="font-medium text-purple-800 mb-2 flex items-center">
            <Sparkles className="h-4 w-4 mr-1" />
            Answer
          </h3>
          <p className="text-gray-700">{result}</p>
        </motion.div>
      )}
    </div>
  );
};

export default QueryInterface;