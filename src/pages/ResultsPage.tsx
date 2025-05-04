import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import ScrapedContent from '../components/ScrapedContent';
import QueryInterface from '../components/QueryInterface';
import LoadingIndicator from '../components/LoadingIndicator';
import { getWebsite } from '../services/api';

const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [website, setWebsite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWebsite = async () => {
      try {
        if (!id) {
          setError('No website ID provided');
          setLoading(false);
          return;
        }
        
        const response = await getWebsite(id);
        setWebsite(response.data);
      } catch (err: any) {
        if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError('Failed to load website data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchWebsite();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
        <LoadingIndicator message="Loading website data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <Link 
            to="/"
            className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <Link 
          to="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>
        
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <ScrapedContent website={website} />
          </div>
          <div>
            <QueryInterface websiteId={website._id} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResultsPage;