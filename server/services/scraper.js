import * as cheerio from "cheerio";
import axios from "axios";
import { fileTypeFromBuffer } from "file-type";
import pLimit from "p-limit";
import analyzer from "./analyzer.js";
import mammoth from "mammoth"; // Import the new .docx parser

// --- Logger Utility ---
const colors = { reset: "\x1b[0m", blue: "\x1b[34m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m" };
const logger = {
	info: (message) => console.log(`${colors.blue}[INFO]${colors.reset} ${message}`),
	success: (message) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
	error: (message) => console.error(`${colors.red}[ERROR]${colors.reset} ${message}`),
	warn: (message) => console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`),
};

// --- Configuration ---
const MAX_PAGES_TO_SCRAPE = 5000;
const REQUEST_TIMEOUT = 30000;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36";
const CONCURRENT_REQUESTS = 50;
const htmlLimit = pLimit(CONCURRENT_REQUESTS);

const cleanContent = (text) => text?.replace(/\s+/g, " ").trim() || "";

// =========================================================================
//  NEW: Stricter URL Filtering Logic (Now includes docx as a valid type)
// =========================================================================
const BANNED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'mp4', 'mov', 'avi', 'wmv', 'zip', 'rar', 'xml', 'css', 'js', 'ico'];
const BANNED_PATH_SEGMENTS = ['/gallery/', '/portfolio/', '/jobs/', '/paper/', '/photogallery/', '/tenders/', '/EntDownloads/', '/tender/', '/events/', '/galleries/', '/media/', '/assets/', '/images/', '/videos/'];
const VALID_DOC_EXTENSIONS = ['pdf', 'docx'];

const isValidUrl = (url) => {
	try {
		const lowerCaseUrl = url.toLowerCase();
		const extension = lowerCaseUrl.split('.').pop().split('?')[0];
		if (BANNED_EXTENSIONS.includes(extension)) return false;
		for (const segment of BANNED_PATH_SEGMENTS) {
			if (lowerCaseUrl.includes(segment)) return false;
		}
		return true;
	} catch (e) { return false; }
};

const getUrlType = (url) => {
	const lowerCaseUrl = url.toLowerCase();
	for (const ext of VALID_DOC_EXTENSIONS) {
		if (lowerCaseUrl.endsWith(`.${ext}`)) return ext;
	}
	return 'html';
};


const scrapePageOrDoc = async (url, targetDomain) => {
	logger.info(`Processing -> ${url}`);
	try {
		const urlType = getUrlType(url);

		// Handle PDF and DOCX documents by downloading them directly
		if (urlType === 'pdf' || urlType === 'docx') {
			const response = await axios.get(url, { responseType: 'arraybuffer', headers: { "User-Agent": USER_AGENT }, timeout: REQUEST_TIMEOUT });
			let content = "";
			let success = false;

			if (urlType === 'pdf') {
				const pdfResult = await analyzer.processPdfWithOcr(response.data);
				if (pdfResult) {
					content = pdfResult;
					success = true;
				}
			} else if (urlType === 'docx') {
				const docxResult = await mammoth.extractRawText({ buffer: response.data });
				content = cleanContent(docxResult.value);
				success = true;
			}

			if (success) logger.success(`Successfully processed document: ${url}`);
			else logger.error(`Failed to extract text from document: ${url}`);

			return {
				title: `${urlType.toUpperCase()}: ${url.split('/').pop()}`,
				content: content,
				type: urlType,
				url,
				success
			};
		}

		// --- Handle HTML pages ---
		const response = await axios.get(url, {
			headers: { "User-Agent": USER_AGENT }, timeout: REQUEST_TIMEOUT,
			responseType: 'arraybuffer', maxRedirects: 5,
		});

		const buffer = Buffer.from(response.data);
		const fileType = await fileTypeFromBuffer(buffer);
		if (fileType?.mime === 'application/pdf') {
			const pdfText = await analyzer.processPdfWithOcr(buffer);
			return { type: 'pdf', content: pdfText, url, success: !!pdfText };
		}
		// Could add a check for docx filetype here as well if needed

		const contentTypeHeader = response.headers['content-type'];
		if (!contentTypeHeader || !contentTypeHeader.includes('text/html')) {
			logger.warn(`Skipping non-HTML content at ${url} (Type: ${contentTypeHeader || 'unknown'})`);
			return { success: false, error: 'Non-HTML content type' };
		}

		const htmlContent = buffer.toString('utf8');
		const $ = cheerio.load(htmlContent);
		const title = $("title").text().trim() || url;
		const links = new Set();

		$("body a[href]").each((_, el) => {
			const link = $(el).attr("href");
			if (link && link.trim() && !link.startsWith('#') && !link.startsWith('javascript:')) {
				try {
					const absoluteUrl = new URL(link, url).href;
					const cleanedUrl = absoluteUrl.split("#")[0].replace(/\/$/, "");
					if (new URL(cleanedUrl).hostname === targetDomain) {
						links.add(cleanedUrl);
					}
				} catch (e) { /* Ignore */ }
			}
		});

		$("script, style, noscript, iframe, svg, canvas, form, img").remove();
		const pageText = cleanContent($("body").text());
		logger.success(`Successfully scraped HTML: ${url}`);
		return {
			title, content: pageText,
			links: Array.from(links),
			type: 'html', url, success: true
		};
	} catch (error) {
		const errorMessage = error.response ? `HTTP ${error.response.status}` : error.message;
		logger.error(`Failed to process ${url}: ${errorMessage}`);
		return { success: false, error: errorMessage, url };
	}
};

const scrapeWebsite = async (initialBaseUrl) => {
	if (!initialBaseUrl) throw new Error("URL is required.");
	let baseUrl = initialBaseUrl.trim();
	if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(baseUrl)) baseUrl = "https://" + baseUrl;
	const parsedBaseUrl = new URL(baseUrl);
	const targetDomain = parsedBaseUrl.hostname;
	const startTime = Date.now();

	const initialUrl = parsedBaseUrl.href.replace(/\/$/, "");
	const queue = [initialUrl];
	const visited = new Set([initialUrl]);

	let allContent = "";
	let siteTitle = "";
	let titleFound = false;
	const scrapingErrors = [];
	let pagesScraped = 0, pdfsScraped = 0, docxScraped = 0;
	const contentSections = [];

	logger.info(`Crawl Start for ${targetDomain}...`);

	while (queue.length > 0 && visited.size < MAX_PAGES_TO_SCRAPE) {
		const batch = queue.splice(0, CONCURRENT_REQUESTS);
		logger.info(`Processing batch of ${batch.length}. Visited: ${visited.size}. Queue: ${queue.length}.`);

		const promises = batch.map(url => htmlLimit(() => scrapePageOrDoc(url, targetDomain)));
		const batchResults = await Promise.allSettled(promises);

		for (const result of batchResults) {
			if (result.status === 'rejected' || !result.value?.success) {
				if (result.value?.url) scrapingErrors.push({ url: result.value.url, error: result.value.error });
				continue;
			}

			const pageData = result.value;
			if (pageData.content) {
				if (pageData.type === 'pdf') pdfsScraped++;
				if (pageData.type === 'docx') docxScraped++;
				if (pageData.type === 'html') pagesScraped++;

				if (pagesScraped === 1 && !siteTitle) {
					const cleanTitle = pageData.title.trim();
					if (cleanTitle && cleanTitle.length > 3 && cleanTitle.length < 100) {
						siteTitle = cleanTitle;
						titleFound = true;
						logger.success(`Found site title: ${siteTitle}`);
					}
				}

				allContent += `\n\n--- START OF CONTENT FROM ${pageData.type.toUpperCase()}: ${pageData.url} ---\n${pageData.content}\n--- END OF CONTENT FROM ${pageData.type.toUpperCase()}: ${pageData.url} ---\n`;
			}

			if (pageData.type === 'html' && pageData.links) {
				for (const link of pageData.links) {
					if (!visited.has(link) && isValidUrl(link)) {
						visited.add(link);
						queue.push(link);
					}
				}
			}
		}
	}

	// Calculate final statistics
	const duration = Date.now() - startTime;
	stats.averageContentQuality = stats.totalPages > 0 ?
		(contentSections.reduce((sum, section) => sum + section.quality, 0) / contentSections.length) : 0;

	// Sort content sections by quality for better organization
	contentSections.sort((a, b) => b.quality - a.quality);

	// Set fallback title if none was found
	if (!siteTitle) {
		siteTitle = `${targetDomain} - Scraped Content`;
		logger.warn(`No suitable title found, using fallback: ${siteTitle}`);
	}

	// Generate final report
	logger.info("📋 ==================== CRAWL COMPLETE ====================");
	logger.success(`✅ Completed in ${(duration / 1000).toFixed(2)}s. Total unique links found: ${visited.size}.`);
	logger.info(`HTML: ${pagesScraped}, PDFs: ${pdfsScraped}, DOCX: ${docxScraped}, Errors: ${scrapingErrors.length}`);

	return {
		url: parsedBaseUrl.href, title: siteTitle, content: allContent,
		stats: { htmlPages: pagesScraped, pdfDocuments: pdfsScraped, docxDocuments: docxScraped, totalPages: visited.size, scrapingDuration: duration, },
		scrapingErrors: scrapingErrors
	};
};

export default { scrapeWebsite };