// --- START OF FILE scraper.js ---

import * as cheerio from "cheerio";
import axios from "axios";

// --- Configuration ---
const MAX_PAGES_TO_SCRAPE = 10; // Limit the number of pages to avoid excessive crawling
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout per request
const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
// --- End Configuration ---

// Scrape a single page and extract its content and links
const scrapePageContent = async (url, targetDomain) => {
	try {
		console.log(`Scraping: ${url}`);
		const response = await axios.get(url, {
			headers: { "User-Agent": USER_AGENT },
			timeout: REQUEST_TIMEOUT,
		});

		if (response.status !== 200) {
			console.warn(`Failed to fetch ${url}: Status ${response.status}`);
			return null;
		}

		// Ensure content is HTML before parsing
		const contentType = response.headers["content-type"];
		if (!contentType || !contentType.includes("text/html")) {
			console.warn(`Skipping non-HTML content at ${url}: ${contentType}`);
			return null;
		}

		const $ = cheerio.load(response.data);

		// Extract page title
		const title = $("title").text().trim() || url; // Use URL as fallback title

		// Remove unnecessary elements
		$(
			"script, style, noscript, iframe, img, svg, canvas, button, header, footer, nav, aside"
		).remove(); // More aggressive removal

		// Extract text content - prioritize main content areas
		let pageText = "";
		const mainContent = $(
			'main, article, #content, .content, .main, [role="main"], .post-content, .entry-content' // Added common blog content classes
		);

		if (mainContent.length > 0) {
			pageText = mainContent.text();
		} else {
			// Fallback to body if specific main areas aren't found
			pageText = $("body").text();
		}

		const cleanedContent = cleanContent(pageText);

		// Extract relevant links from the *entire* page (before removing nav/footer etc if needed)
		const links = new Set(); // Use Set to avoid duplicate links on the same page
		$("a[href]").each((i, el) => {
			const link = $(el).attr("href");
			if (link) {
				try {
					const absoluteUrl = new URL(link, url).href; // Resolve relative URLs
					// Clean URL (remove hash, trailing slash)
					const cleanedUrl = absoluteUrl.split("#")[0].replace(/\/$/, "");
					// Check if it belongs to the target domain
					if (new URL(cleanedUrl).hostname === targetDomain) {
						links.add(cleanedUrl);
					}
				} catch (e) {
					// Ignore invalid URLs
					// console.warn(`Ignoring invalid link: ${link} on page ${url}`);
				}
			}
		});

		return { title, content: cleanedContent, links: Array.from(links) };
	} catch (error) {
		if (axios.isAxiosError(error)) {
			console.error(
				`Axios error scraping ${url}: ${error.message} (Status: ${error.response?.status})`
			);
		} else {
			console.error(`Error scraping page ${url}:`, error.message);
		}
		return null; // Return null on error for this page
	}
};

// Clean content helper function
const cleanContent = (text) => {
	if (!text) return "";
	return text
		.replace(/<[^>]*>/g, " ") // Remove any remaining HTML tags just in case
		.replace(/\s+/g, " ") // Replace multiple spaces/newlines with single space
		.replace(/\t+/g, " ") // Replace tabs with spaces
		.trim();
};

// Main function to scrape multiple pages of a website
const scrapeWebsite = async (baseUrl) => {
	const visitedUrls = new Set();
	const urlsToVisit = [baseUrl];
	let allContent = "";
	let pageCount = 0;
	let siteTitle = "Untitled Site";

	try {
		const base = new URL(baseUrl);
		const targetDomain = base.hostname;
		console.log(`Starting crawl for domain: ${targetDomain}`);

		while (urlsToVisit.length > 0 && pageCount < MAX_PAGES_TO_SCRAPE) {
			const currentUrl = urlsToVisit.shift(); // Get the next URL (FIFO queue)

			// Clean URL before checking/adding
			const cleanCurrentUrl = currentUrl.split("#")[0].replace(/\/$/, "");

			if (visitedUrls.has(cleanCurrentUrl)) {
				continue; // Skip already visited
			}

			// Check domain again (important for redirects)
			try {
				if (new URL(cleanCurrentUrl).hostname !== targetDomain) {
					console.log(`Skipping external link: ${cleanCurrentUrl}`);
					continue;
				}
			} catch (e) {
				console.warn(`Skipping invalid URL format: ${cleanCurrentUrl}`);
				continue;
			}

			visitedUrls.add(cleanCurrentUrl);
			pageCount++;

			const pageData = await scrapePageContent(cleanCurrentUrl, targetDomain);

			if (pageData) {
				// Use the title of the first successfully scraped page as the site title
				if (pageCount === 1 && pageData.title !== cleanCurrentUrl) {
					// Avoid using URL as title if possible
					siteTitle = pageData.title;
				}

				// Append content with clear separators
				allContent += `\n\n--- Page: ${pageData.title} (${cleanCurrentUrl}) ---\n\n${pageData.content}`;

				// Add new, unvisited internal links to the queue
				pageData.links.forEach((link) => {
					const cleanLink = link.split("#")[0].replace(/\/$/, "");
					if (
						!visitedUrls.has(cleanLink) &&
						new URL(cleanLink).hostname === targetDomain
					) {
						urlsToVisit.push(cleanLink); // Add to the end of the queue
					}
				});
			} else {
				// Reduce page count if scrape failed significantly (optional)
				// pageCount--; // Uncomment if you only want to count *successful* scrapes towards the limit
				console.warn(`Failed to get data for ${cleanCurrentUrl}, skipping.`);
			}

			// Optional delay to be polite to the server
			// await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
		}

		console.log(
			`Finished crawling. Scraped ${pageCount} pages. Total URLs visited/attempted: ${visitedUrls.size}`
		);

		return { title: siteTitle, content: allContent.trim() };
	} catch (error) {
		console.error("Critical error during website crawl:", error);
		throw new Error(`Failed to complete website crawl: ${error.message}`);
	}
};

export default {
	scrapeWebsite, // This now crawls the site
	// scrapePageContent // You could also export this if needed elsewhere
};
// --- END OF FILE scraper.js ---
