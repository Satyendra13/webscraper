import axios from "axios";
// const API_URL = "http://localhost:5000/api";
const API_URL = "https://webscraper-production-0045.up.railway.app/api";

export const scrapeWebsite = async (url: string) => {
	return axios.post(`${API_URL}/websites/scrape`, { url });
};

export const getWebsite = async (id: string) => {
	return axios.get(`${API_URL}/websites/${id}`);
};

export const queryWebsite = async (id: string, query: string) => {
	return axios.post(`${API_URL}/websites/${id}/query`, { query });
};
