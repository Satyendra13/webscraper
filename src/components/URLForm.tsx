import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { scrapeWebsite } from '../services/api';
import { validateURL } from '../utils';

const URLForm: React.FC = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError('');
    
    // Validate URL
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    
    if (!validateURL(url)) {
      setError('Please enter a valid URL and only educational website URL.');
      return;
    }
    
    // Show loading state
    setIsLoading(true);
    
    try {
      // Call API to scrape website
      const response = await scrapeWebsite(url);
      
      // Navigate to results page with the ID
      navigate(`/results/${response.data._id}`);
    } catch (err: any) {
      console.log(err)
      // Handle errors
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred while scraping the website. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Enter a website URL to analyze</h2>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="url">
            Website URL
          </label>
          <div className="flex rounded-md shadow-sm">
            <div className="relative flex-grow focus-within:z-10">
              <input
                type="text"
                id="url"
                name="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className={`block w-full rounded-l-md border-0 py-3 pl-4 pr-12 text-gray-900 ring-1 ring-inset ${
                  error ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300 focus:ring-blue-600'
                } focus:outline-none focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'url-error' : undefined}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isLoading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
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
                  Analyze
                </>
              )}
            </button>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 text-sm text-red-600 flex items-center"
              id="url-error"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              {error}
            </motion.p>
          )}
        </div>
        
        <p className="text-center text-gray-600 text-sm mt-4">
          WebInsight will scrape the content, analyze it, and store it for future reference.
        </p>
      </motion.form>
    </div>
  );
};

export default URLForm;