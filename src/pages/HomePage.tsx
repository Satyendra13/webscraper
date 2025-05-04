import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, Database, Brain } from 'lucide-react';
import URLForm from '../components/URLForm';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: <Globe className="h-8 w-8 text-blue-500" />,
      title: 'Web Scraping',
      description: 'Extract content from any website with a simple URL input'
    },
    {
      icon: <Search className="h-8 w-8 text-blue-500" />,
      title: 'Content Analysis',
      description: 'Analyze keywords, frequencies, and generate summaries automatically'
    },
    {
      icon: <Database className="h-8 w-8 text-blue-500" />,
      title: 'Data Storage',
      description: 'Store all scraped content in MongoDB for future reference'
    },
    {
      icon: <Brain className="h-8 w-8 text-blue-500" />,
      title: 'Smart Queries',
      description: 'Ask questions about the content and get intelligent answers'
    }
  ];
  
  return (
    <div className="py-12">
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16"
      >
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4"
        >
          <span className="text-blue-600">Extract</span> and <span className="text-blue-600">Analyze</span> Web Content
        </motion.h1>
        <motion.p
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-xl text-gray-600 max-w-3xl mx-auto"
        >
          Input any website URL, and we'll scrape the content, analyze it, and provide insights. Ask questions about the content or get detailed analytics.
        </motion.p>
      </motion.section>
      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 flex justify-center">
        <URLForm />
      </section>
      
      <motion.section
        id="features"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 rounded-lg shadow-sm"
      >
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Key Features</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="mb-4 p-2 rounded-full bg-blue-100 inline-block">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
      
      <motion.section
        id="about"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-xl overflow-hidden">
          <div className="p-8 md:p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to extract insights from any website?</h2>
            <p className="text-lg mb-6 opacity-90">
              Our web scraping and analysis tool helps you understand content, track keyword frequency, 
              and get intelligent answers about any webpage.
            </p>
            <a 
              href="#top" 
              className="inline-block bg-white text-blue-600 px-6 py-3 rounded-md font-semibold hover:bg-blue-50 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Get Started Now
            </a>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default HomePage;