import express from "express";
import scraper from "../services/scraper.js";
import analyzer from "../services/analyzer.js";
import Website from "../models/Website.js";

const router = express.Router();

// --- Helper Function ---
const splitContentIntoDocuments = (content) => {
	if (!content) return [];
	const documents = content.split(/--- (?:START|END) OF CONTENT FROM (?:PAGE|PDF): .*? ---\n?/);
	return documents.filter(doc => doc.trim().length > 50);
};

// GET /api/websites - Get all websites (paginated)
router.get("/", async (req, res, next) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const search = req.query.search || "";
		const skip = (page - 1) * limit;
		let query = search ? { $text: { $search: search } } : {};
		const websites = await Website.find(query)
			.select("url title createdAt stats metadata.contentType")
			.sort({ createdAt: -1 }).skip(skip).limit(limit);
		const totalWebsites = await Website.countDocuments(query);
		res.json({ websites, totalPages: Math.ceil(totalWebsites / limit), currentPage: page });
	} catch (err) { next(err); }
});

// POST /api/websites/scrape - Scrape a new website
router.post('/scrape', async (req, res, next) => {
	const { url } = req.body;
	if (!url) return res.status(400).json({ error: "URL is required." });
	try {
		const existingWebsite = await Website.findOne({ url }).select('-content');;
		if (existingWebsite) {
			res.status(201).json({ message: "Website processed successfully.", _id: existingWebsite._id });
		}
		const scrapedData = await scraper.scrapeWebsite(url);
		const analysis = analyzer.analyzeContent(scrapedData.content);
		const websiteDoc = {
			url: scrapedData.url, title: scrapedData.title, content: scrapedData.content,
			summary: analysis.summary, keywords: analysis.keywords, sentences: analysis.sentences,
			stats: { ...scrapedData.stats, ...analysis.contentStats },
			metadata: { scrapingDuration: scrapedData.stats.scrapingDuration, scrapingErrors: scrapedData.scrapingErrors }
		};
		const savedWebsite = await Website.findOneAndUpdate({ url: scrapedData.url }, websiteDoc, { new: true, upsert: true });
		res.status(201).json({ message: "Website processed successfully.", _id: savedWebsite._id });
	} catch (error) { next(error); }
});

// GET /api/websites/:id - Get a specific website's details
router.get('/:id', async (req, res, next) => {
	try {
		const website = await Website.findById(req.params.id).select('-content');
		if (!website) return res.status(404).json({ error: "Website not found" });
		res.json(website);
	} catch (error) { next(error); }
});

// POST /api/websites/query/:id - Ask a question about a website
router.post('/:id/query', async (req, res, next) => {
	const { id } = req.params;
	const { query } = req.body;
	if (!query) return res.status(400).json({ error: "Query is required." });
	try {
		const website = await Website.findById(id);
		if (!website) return res.status(404).json({ error: "Website not found." });
		const analysisData = {
			content: website.content, summary: website.summary, keywords: website.keywords,
			sentences: website.sentences, documents: splitContentIntoDocuments(website.content)
		};
		const answer = await analyzer.queryContent(query, analysisData);
		res.json({ query, result: answer });
	} catch (error) { next(error); }
});

// DELETE /api/websites/:id - Delete a website record
router.delete("/:id", async (req, res, next) => {
	try {
		const website = await Website.findByIdAndDelete(req.params.id);
		if (!website) return res.status(404).json({ message: "Website not found" });
		res.status(200).json({ message: `Website "${website.title}" deleted successfully` });
	} catch (err) { next(err); }
});

export default router;