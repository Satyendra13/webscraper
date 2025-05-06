import express from "express";
import scraper from "../services/scraper.js";
import analyzer from "../services/analyzer.js";
import Website from "../models/Website.js";

const router = express.Router();

// Get all websites (paginated)
router.get("/", async (req, res, next) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const skip = (page - 1) * limit;

		const websites = await Website.find()
			.select("url title createdAt")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit);

		const totalWebsites = await Website.countDocuments();

		res.json({
			websites,
			totalPages: Math.ceil(totalWebsites / limit),
			currentPage: page,
			totalWebsites,
		});
	} catch (err) {
		next(err);
	}
});

// Scrape a website
router.post("/scrape", async (req, res, next) => {
	try {
		const { url } = req.body;
		if (!url) {
			return res.status(400).json({ message: "URL is required" });
		}

		// Check if website has already been scraped
		const existingWebsite = await Website.findOne({ url });
		if (existingWebsite) {
			return res.json(existingWebsite);
		}

		// Scrape website content
		// const { title, content } = await scraper.scrapeWebsite(url);
		console.log(`Starting process for URL: ${url}`);
		// 1. Scrape the website (multiple pages)
		const { title, content } = await scraper.scrapeWebsite(url);

		if (!content) {
			console.error("Scraping resulted in empty content.");
			return;
		}
		console.log(
			`Scraping complete. Site Title: ${title}. Content Length: ${content.length}`
		);

		// 2. Analyze the combined content (summary & keywords using HF/fallback)
		const { summary, keywords } = await analyzer.analyzeContent(content);
		// Analyze content
		// const { summary, keywords } = await analyzer.analyzeContent(content);

		// Save to database
		const website = new Website({
			url,
			title,
			content,
			summary,
			keywords,
		});

		await website.save();

		res.status(201).json(website);
	} catch (err) {
		next(err);
	}
});

// Get a specific website
router.get("/:id", async (req, res, next) => {
	try {
		const website = await Website.findById(req.params.id);

		if (!website) {
			return res.status(404).json({ message: "Website not found" });
		}

		res.json(website);
	} catch (err) {
		next(err);
	}
});

// Query a website
router.post("/:id/query", async (req, res, next) => {
	try {
		const { query } = req.body;
		const website = await Website.findById(req.params.id);

		if (!website) {
			return res.status(404).json({ message: "Website not found" });
		}

		if (!query) {
			return res.status(400).json({ message: "Query is required" });
		}

		const result = await analyzer.queryContent(
			query,
			website.content,
			website.summary,
			website.keywords
		);

		res.json({ result });
	} catch (err) {
		next(err);
	}
});

export default router;
