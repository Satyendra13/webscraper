// --- START OF FILE analyzer.js ---

import natural from "natural";
import huggingface from "./huggingface.js"; // Assuming this still exists for summary/keywords
import {
	GoogleGenerativeAI,
	HarmCategory,
	HarmBlockThreshold,
} from "@google/generative-ai";

// --- Existing Tokenizer and Stopwords ---
const tokenizer = new natural.WordTokenizer();
const stopwords = [
	"a",
	"about",
	"above",
	"after",
	"again",
	"against",
	"all",
	"am",
	"an",
	"and",
	"any",
	"are",
	"as",
	"at",
	"be",
	"because",
	"been",
	"before",
	"being",
	"below",
	"between",
	"both",
	"but",
	"by",
	"could",
	"did",
	"do",
	"does",
	"doing",
	"down",
	"during",
	"each",
	"few",
	"for",
	"from",
	"further",
	"had",
	"has",
	"have",
	"having",
	"he",
	"her",
	"here",
	"hers",
	"herself",
	"him",
	"himself",
	"his",
	"how",
	"i",
	"if",
	"in",
	"into",
	"is",
	"it",
	"its",
	"itself",
	"me",
	"more",
	"most",
	"my",
	"myself",
	"no",
	"nor",
	"not",
	"of",
	"off",
	"on",
	"once",
	"only",
	"or",
	"other",
	"ought",
	"our",
	"ours",
	"ourselves",
	"out",
	"over",
	"own",
	"same",
	"she",
	"should",
	"so",
	"some",
	"such",
	"than",
	"that",
	"the",
	"their",
	"theirs",
	"them",
	"themselves",
	"then",
	"there",
	"these",
	"they",
	"this",
	"those",
	"through",
	"to",
	"too",
	"under",
	"until",
	"up",
	"very",
	"was",
	"we",
	"were",
	"what",
	"when",
	"where",
	"which",
	"while",
	"who",
	"whom",
	"why",
	"with",
	"would",
	"you",
	"your",
	"yours",
	"yourself",
	"yourselves",
];
// --- End of Stopwords ---

// --- Google Gemini Setup ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI;
let geminiModel;

if (GEMINI_API_KEY) {
	genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
	geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // Or choose another suitable model
	console.log("Gemini AI initialized.");
} else {
	console.warn(
		"GEMINI_API_KEY not found in environment variables. Gemini querying will be disabled."
	);
}

const generationConfig = {
	temperature: 0.5, // Adjust creativity/factuality
	topK: 1,
	topP: 1,
	maxOutputTokens: 2048, // Adjust as needed
};

// Safety settings to prevent harmful content generation
const safetySettings = [
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
		threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
		threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
	},
];
// --- End of Gemini Setup ---

// Analyze content to extract summary and keywords (keeps HuggingFace integration)
const analyzeContent = async (content) => {
	try {
		// Try to get AI-powered summary first
		let summary = "Could not generate summary."; // Default value
		try {
			const hfSummary = await huggingface.summarizeContent(content);
			if (hfSummary && !hfSummary.error) {
				summary = hfSummary.summary;
			} else {
				summary = generateSummary(content); // Fallback
			}
		} catch (error) {
			console.warn(
				"HuggingFace summarization failed, using fallback:",
				error.message
			);
			summary = generateSummary(content); // Fallback
		}

		// Try to get AI-powered keywords first
		let keywords = []; // Default value
		try {
			const hfKeywords = await huggingface.extractKeywords(content);
			if (hfKeywords && !hfKeywords.error && hfKeywords.keywords) {
				keywords = hfKeywords.keywords.map((k) => ({
					word: k.word,
					// Use score if available, otherwise default or mark differently
					count: k.score ? Math.round(k.score * 100) : "N/A",
				}));
			} else {
				keywords = extractKeywords(content); // Fallback
			}
		} catch (error) {
			console.warn(
				"HuggingFace keyword extraction failed, using fallback:",
				error.message
			);
			keywords = extractKeywords(content); // Fallback
		}

		return { summary, keywords };
	} catch (error) {
		console.error("Error analyzing content:", error);
		// Return default structure on failure
		return { summary: "Error during analysis.", keywords: [] };
	}
};

// Traditional summary generation (fallback)
const generateSummary = (content) => {
	if (!content) return "No content provided for summary.";
	const sentences = content.match(/[^.!?]+[.!?]+\s*/g) || []; // Added \s* for better sentence splitting
	if (sentences.length === 0) {
		// Handle case where no sentences are found (maybe just a short string)
		return content.substring(0, 300) + (content.length > 300 ? "..." : "");
	}

	let summary = sentences.slice(0, 3).join(""); // Join directly

	// If summary is too short, add more sentences
	if (summary.length < 200 && sentences.length > 3) {
		summary = sentences.slice(0, Math.min(5, sentences.length)).join("");
	}

	// If still too short
	if (summary.length < 100) {
		// Take beginning of content as last resort
		summary = content.substring(0, 300) + (content.length > 300 ? "..." : "");
	}

	return summary.trim(); // Trim final result
};

// Traditional keyword extraction (fallback)
const extractKeywords = (content) => {
	if (!content) return [];
	// Tokenize the content
	const tokens = tokenizer.tokenize(content.toLowerCase());
	if (!tokens) return [];

	// Remove stopwords and non-alphabetic words
	const filteredTokens = tokens.filter(
		(token) =>
			token.length > 2 && !stopwords.includes(token) && /^[a-z]+$/.test(token)
	);

	// Count word frequencies
	const wordFrequencies = {};
	filteredTokens.forEach((token) => {
		wordFrequencies[token] = (wordFrequencies[token] || 0) + 1;
	});

	// Convert to array and sort by frequency
	const keywords = Object.entries(wordFrequencies)
		.map(([word, count]) => ({ word, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 30); // Get top 30 keywords

	return keywords;
};

// Answer queries using Google Gemini
const queryContent = async (query, content, summary, keywords) => {
	const lowerQuery = query.toLowerCase();

	// Handle specific requests directly
	if (lowerQuery.includes("summary") || lowerQuery.includes("summarize")) {
		return summary || "No summary available.";
	}
	if (
		lowerQuery.includes("keyword") ||
		lowerQuery.includes("frequency") ||
		lowerQuery.includes("topics")
	) {
		if (keywords && keywords.length > 0) {
			return generateKeywordResponse(lowerQuery, keywords);
		} else {
			return "No keywords available.";
		}
	}

	// Use Gemini for general queries if available
	if (!geminiModel) {
		console.warn("Gemini model not available. Falling back to simple search.");
		return searchContent(query, content); // Fallback if Gemini isn't configured
	}

	try {
		console.log("Querying Gemini...");
		// Construct a clear prompt for Gemini
		const prompt = `Based ONLY on the following text content, answer the user's question. Do not use any external knowledge. If the answer cannot be found in the text, clearly state that the information is not available in the provided content.

        TEXT CONTENT:
        ---
        ${content}
        ---

        USER QUESTION: ${query}`;

		const result = await geminiModel.generateContent(prompt, {
			generationConfig,
			safetySettings,
		});

		const response = result.response;
		const text = response.text();

		if (!text || response.promptFeedback?.blockReason) {
			console.warn(
				"Gemini response blocked or empty. Reason:",
				response.promptFeedback?.blockReason || "Empty Response"
			);
			// Fallback if Gemini response is blocked or empty
			return searchContent(query, content);
		}

		console.log("Gemini response received.");
		return text;
	} catch (error) {
		console.error("Error querying Gemini:", error);
		// Fallback to simple search on Gemini API error
		console.log("Falling back to simple search due to Gemini error.");
		return searchContent(query, content);
	}
};

// Generate response for keyword-related queries
const generateKeywordResponse = (query, keywords) => {
	if (!keywords || keywords.length === 0) return "No keywords extracted.";
	// Check if asking for specific keyword
	for (const { word, count } of keywords) {
		// Make sure word is defined before checking includes
		if (word && query.includes(word)) {
			return `The keyword "${word}" was identified in the content${
				count !== "N/A" ? ` with a score/frequency of ${count}` : ""
			}.`;
		}
	}

	// Return top keywords
	const topKeywords = keywords
		.slice(0, 10)
		.map((k) => `${k.word}${k.count !== "N/A" ? ` (${k.count})` : ""}`)
		.join(", ");

	return `The most frequent keywords identified are: ${topKeywords || "None"}.`;
};

// Search content for relevant information (fallback)
const searchContent = (query, content) => {
	if (!content) return "No content available to search.";
	// Split content into sentences
	const sentences = content.match(/[^.!?]+[.!?]+\s*/g) || [];
	if (sentences.length === 0)
		return "Could not parse content into sentences for searching.";

	// Simple search: find sentences containing query terms
	// Filter out short/common words from query for better matching
	const queryWords = query
		.toLowerCase()
		.split(" ")
		.filter((w) => w.length > 3 && !stopwords.includes(w));
	if (queryWords.length === 0)
		return "Please provide more specific search terms."; // Handle very generic queries

	const relevantSentences = sentences.filter((sentence) => {
		const lowerSentence = sentence.toLowerCase();
		// Check if *all* significant query words are in the sentence for higher relevance (optional)
		// return queryWords.every((word) => lowerSentence.includes(word));
		// Or keep the original 'some' logic:
		return queryWords.some((word) => lowerSentence.includes(word));
	});

	if (relevantSentences.length > 0) {
		// Return up to 3 relevant sentences
		return relevantSentences.slice(0, 3).join(" ").trim();
	}

	return "I couldn't find specific information related to your query in the content.";
};

export default {
	analyzeContent,
	queryContent,
};
// --- END OF FILE analyzer.js ---
