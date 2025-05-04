import axios from 'axios';

const API_URL = 'https://api-web-scraper.onrender.com/api';

export const scrapeWebsite = async (url: string) => {
  return axios.post(`${API_URL}/websites/scrape`, { url });
};

export const getWebsite = async (id: string) => {
  return axios.get(`${API_URL}/websites/${id}`);
};

export const queryWebsite = async (id: string, query: string) => {
  return axios.post(`${API_URL}/websites/${id}/query`, { query });
};
