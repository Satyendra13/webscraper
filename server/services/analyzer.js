import natural from "natural";
import dotenv from "dotenv";
dotenv.config();
import {
	GoogleGenerativeAI,
	HarmCategory,
	HarmBlockThreshold,
} from "@google/generative-ai";

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI;
let geminiModel;

if (GEMINI_API_KEY) {
	genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
	geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
	console.log("Gemini AI initialized with model gemini-1.5-flash-latest.");
} else {
	console.warn(
		"GEMINI_API_KEY not found in environment variables. Gemini querying will be disabled, and fallback search will be used."
	);
}

const generationConfig = {
	temperature: 0.5,
	topK: 1,
	topP: 1,
	maxOutputTokens: 2048,
};

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

const analyzeContent = (content) => {
	try {
		const summary = generateSummary(content);
		const keywords = extractKeywords(content);
		return { summary, keywords };
	} catch (error) {
		console.error("Error analyzing content with local methods:", error);
		return { summary: "Error during local content analysis.", keywords: [] };
	}
};

const generateSummary = (content) => {
	if (!content || typeof content !== "string")
		return "No content provided for summary.";
	const sentences = content.match(/[^.!?]+[.!?]+\s*/g) || [];
	if (sentences.length === 0) {
		return content.substring(0, 300) + (content.length > 300 ? "..." : "");
	}

	let summary = sentences.slice(0, 3).join("");

	if (summary.length < 200 && sentences.length > 3) {
		summary = sentences.slice(0, Math.min(5, sentences.length)).join("");
	}

	if (summary.length < 100 && content.length > 0) {
		summary = content.substring(0, 300) + (content.length > 300 ? "..." : "");
	}

	return summary.trim();
};

const extractKeywords = (content) => {
	if (!content || typeof content !== "string") return [];
	const tokens = tokenizer.tokenize(content.toLowerCase());
	if (!tokens) return [];

	const filteredTokens = tokens.filter(
		(token) =>
			token.length > 2 && !stopwords.includes(token) && /^[a-z]+$/.test(token)
	);

	const wordFrequencies = {};
	filteredTokens.forEach((token) => {
		wordFrequencies[token] = (wordFrequencies[token] || 0) + 1;
	});

	const keywords = Object.entries(wordFrequencies)
		.map(([word, count]) => ({ word, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 30);

	return keywords;
};

const queryContent = async (query, content, summary, keywords) => {
	const lowerQuery = query.toLowerCase();

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

	if (!geminiModel) {
		console.warn(
			"Gemini model not available. Falling back to simple search for query:",
			query
		);
		return searchContent(query, content);
	}

	try {
		console.log("Querying Gemini for:", query);
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
				response.promptFeedback?.blockReason || "Empty Response",
				"Falling back."
			);
			return searchContent(query, content);
		}

		console.log("Gemini response received.");
		return text;
	} catch (error) {
		console.error("Error querying Gemini:", error.message);
		console.log(
			"Falling back to simple search due to Gemini error for query:",
			query
		);
		return searchContent(query, content);
	}
};

const generateKeywordResponse = (query, keywords) => {
	if (!keywords || keywords.length === 0) return "No keywords extracted.";
	for (const { word, count } of keywords) {
		if (word && query.includes(word)) {
			return `The keyword "${word}" appears ${count} times in the content.`;
		}
	}
	const topKeywords = keywords
		.slice(0, 10)
		.map((k) => `${k.word} (${k.count})`)
		.join(", ");
	return `The most frequent keywords identified are: ${topKeywords || "None"}.`;
};

const searchContent = (query, content) => {
	if (!content || typeof content !== "string")
		return "No content available to search.";
	const sentences = content.match(/[^.!?]+[.!?]+\s*/g) || [];
	if (sentences.length === 0)
		return "Could not parse content into sentences for searching.";

	const queryWords = query
		.toLowerCase()
		.split(" ")
		.filter((w) => w.length > 3 && !stopwords.includes(w));
	if (queryWords.length === 0)
		return "Please provide more specific search terms for local search.";

	const relevantSentences = sentences.filter((sentence) => {
		const lowerSentence = sentence.toLowerCase();
		return queryWords.some((word) => lowerSentence.includes(word));
	});

	if (relevantSentences.length > 0) {
		return relevantSentences.slice(0, 3).join(" ").trim();
	}

	return "I couldn't find specific information related to your query in the provided content using local search.";
};

export default {
	analyzeContent,
	queryContent,
};
