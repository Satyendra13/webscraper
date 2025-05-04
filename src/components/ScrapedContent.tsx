import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Link2, ChevronDown, ChevronUp } from 'lucide-react';

interface ScrapedContentProps {
  website: {
    _id: string;
    url: string;
    title: string;
    content: string;
    summary: string;
    keywords: { word: string; count: number }[];
    createdAt: string;
  };
}

const ScrapedContent: React.FC<ScrapedContentProps> = ({ website }) => {
  const [expandedContent, setExpandedContent] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-md overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center mb-4">
          <FileText className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-900">{website.title}</h2>
        </div>
        
        <div className="flex items-center text-sm text-gray-500 mb-6">
          <Link2 className="h-4 w-4 mr-1" />
          <a 
            href={website.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {website.url}
          </a>
          <span className="mx-2">•</span>
          <span>Scraped on {formatDate(website.createdAt)}</span>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Summary</h3>
          <p className="text-gray-700 leading-relaxed">{website.summary}</p>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Top Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {website.keywords.slice(0, 10).map((keyword, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {keyword.word} 
                <span className="ml-1 text-blue-500">({keyword.count})</span>
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <button
            onClick={() => setExpandedContent(!expandedContent)}
            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            {expandedContent ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide full content
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show full content
              </>
            )}
          </button>
          
          {expandedContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 p-4 border rounded-md bg-gray-50 text-gray-700 leading-relaxed max-h-96 overflow-y-auto"
            >
              <p>{website.content}</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ScrapedContent;