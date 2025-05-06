import * as cheerio from "cheerio";
import axios from "axios";

const MAX_PAGES_TO_SCRAPE = 50;
const REQUEST_TIMEOUT = 100000;
const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

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

		const contentType = response.headers["content-type"];
		if (!contentType || !contentType.includes("text/html")) {
			console.warn(`Skipping non-HTML content at ${url}: ${contentType}`);
			return null;
		}

		const $ = cheerio.load(response.data);

		const title = $("title").text().trim() || url;

		$(
			"script, style, noscript, iframe, img, svg, canvas, button, header, footer, nav, aside"
		).remove();

		let pageText = "";
		const mainContent = $(
			'main, article, #content, .content, .main, [role="main"], .post-content, .entry-content'
		);

		if (mainContent.length > 0) {
			pageText = mainContent.text();
		} else {
			pageText = $("body").text();
		}

		const cleanedContent = cleanContent(pageText);

		const links = new Set();
		$("a[href]").each((i, el) => {
			const link = $(el).attr("href");
			if (link) {
				try {
					const absoluteUrl = new URL(link, url).href;
					const cleanedUrl = absoluteUrl.split("#")[0].replace(/\/$/, "");
					if (new URL(cleanedUrl).hostname === targetDomain) {
						links.add(cleanedUrl);
					}
				} catch (e) {
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
		return null;
	}
};

const cleanContent = (text) => {
	if (!text) return "";
	return text
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.replace(/\t+/g, " ")
		.trim();
};

const scrapeWebsite = async (initialBaseUrl) => {
	if (
		!initialBaseUrl ||
		typeof initialBaseUrl !== "string" ||
		initialBaseUrl.trim() === ""
	) {
		const errorMsg = "Invalid baseUrl: Must be a non-empty string.";
		console.error(errorMsg, "Received:", initialBaseUrl);
		throw new Error(errorMsg);
	}

	let baseUrl = initialBaseUrl.trim();

	if (baseUrl.startsWith("//")) {
		baseUrl = "https:" + baseUrl;
		console.log(`Normalized protocol-relative baseUrl to: ${baseUrl}`);
	} else if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(baseUrl)) {
		baseUrl = "https://" + baseUrl;
		console.log(`Scheme missing. Normalized baseUrl to: ${baseUrl}`);
	}

	let parsedBaseUrl;
	try {
		parsedBaseUrl = new URL(baseUrl);
		if (
			parsedBaseUrl.protocol !== "http:" &&
			parsedBaseUrl.protocol !== "https:"
		) {
			throw new Error(
				`Unsupported protocol: ${parsedBaseUrl.protocol}. Only http and https are supported by this scraper.`
			);
		}
	} catch (e) {
		const errorMsg = `The baseUrl "${baseUrl}" (derived from input "${initialBaseUrl}") is invalid or uses an unsupported protocol: ${e.message}`;
		console.error(errorMsg);
		throw new Error(errorMsg);
	}

	const visitedUrls = new Set();
	const urlsToVisit = [parsedBaseUrl.href];
	let allContent = "";
	let pageCount = 0;
	let siteTitle = "Untitled Site";

	try {
		const targetDomain = parsedBaseUrl.hostname;
		console.log(
			`Starting crawl for domain: ${targetDomain} (from ${parsedBaseUrl.href})`
		);

		while (urlsToVisit.length > 0 && pageCount < MAX_PAGES_TO_SCRAPE) {
			const currentUrl = urlsToVisit.shift();

			const cleanCurrentUrl = currentUrl.split("#")[0].replace(/\/$/, "");

			if (visitedUrls.has(cleanCurrentUrl)) {
				continue;
			}

			let currentUrlHostname;
			try {
				currentUrlHostname = new URL(cleanCurrentUrl).hostname;
			} catch (e) {
				console.warn(
					`Skipping invalid URL format found in queue: ${cleanCurrentUrl} (Error: ${e.message})`
				);
				continue;
			}

			if (currentUrlHostname !== targetDomain) {
				console.log(
					`Skipping external link: ${cleanCurrentUrl} (Domain: ${currentUrlHostname}, Target: ${targetDomain})`
				);
				continue;
			}

			visitedUrls.add(cleanCurrentUrl);
			pageCount++;

			const pageData = await scrapePageContent(cleanCurrentUrl, targetDomain);

			if (pageData) {
				if (pageCount === 1 && pageData.title !== cleanCurrentUrl) {
					siteTitle = pageData.title;
				}

				allContent += `\n\n--- Page: ${pageData.title} (${cleanCurrentUrl}) ---\n\n${pageData.content}`;

				pageData.links.forEach((link) => {
					const cleanLink = link.split("#")[0].replace(/\/$/, "");
					try {
						if (
							!visitedUrls.has(cleanLink) &&
							new URL(cleanLink).hostname === targetDomain
						) {
							urlsToVisit.push(cleanLink);
						}
					} catch (e) {
						console.warn(
							`Ignoring invalid discovered link: ${cleanLink} (Error: ${e.message})`
						);
					}
				});
			} else {
				console.warn(`Failed to get data for ${cleanCurrentUrl}, skipping.`);
			}
		}

		console.log(
			`Finished crawling. Scraped ${pageCount} pages. Total URLs visited/attempted: ${visitedUrls.size}`
		);

		return { title: siteTitle, content: allContent.trim() };
	} catch (error) {
		console.error("Critical error during website crawl:", error.message);
		throw new Error(
			`Failed to complete website crawl for "${initialBaseUrl}": ${error.message}`
		);
	}
};

export default {
	scrapeWebsite,
};
