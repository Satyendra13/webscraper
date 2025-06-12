import natural from "natural";
import dotenv from "dotenv";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

dotenv.config();

const { TfIdf } = natural;
const tokenizer = new natural.WordTokenizer();
const sentenceTokenizer = new natural.SentenceTokenizer();
const stopwords = new Set(natural.stopwords);

// --- Gemini AI Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let geminiModel;
if (GEMINI_API_KEY) {
	try {
		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
		console.log("[AI] Gemini AI (gemini-1.5-flash-latest) initialized successfully.");
	} catch (error) { console.error("[AI] Failed to initialize Gemini AI:", error.message); }
} else {
	console.warn("[AI] GEMINI_API_KEY not found. Advanced OCR and Q&A will be disabled.");
}
const generationConfig = { temperature: 0.3, topK: 5, topP: 0.95, maxOutputTokens: 8192 };
const safetySettings = [
	{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
	{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
	{ category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
	{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Processes a PDF buffer. First tries fast text extraction, then falls back to AI-powered OCR.
 */
const processPdfWithOcr = async (pdfBuffer) => {
	try {
		const pdf = (await import('pdf-parse')).default;
		const data = await pdf(pdfBuffer);
		const text = data.text?.trim() || "";
		if (text.length > 100) {
			console.log("[PDF Processor] Successfully extracted text using basic parser.");
			return text.replace(/\s+/g, " ");
		}
	} catch (e) {
		console.warn("[PDF Processor] Basic parser failed. This is expected for some PDFs. Falling back to OCR.");
	}

	console.log("[PDF Processor] Basic parsing insufficient. Using Gemini for advanced OCR...");
	if (!geminiModel) {
		console.error("[OCR] Gemini model not available. Cannot perform OCR.");
		return "";
	}

	try {
		const prompt = "Please perform OCR and extract all text content from this PDF document. Present the text exactly as it appears.";
		const result = await geminiModel.generateContent([
			prompt, { inlineData: { data: pdfBuffer.toString("base64"), mimeType: "application/pdf" } },
		]);
		const ocrText = result.response.text();
		console.log(`[OCR] Gemini successfully extracted ${ocrText.length} characters.`);
		return ocrText.replace(/\s+/g, " ");
	} catch (error) {
		console.error("[OCR] Gemini failed to process the PDF:", error.message);
		return "";
	}
};

const splitContentIntoDocuments = (content) => {
	if (!content) return [];
	return content.split(/--- (?:START|END) OF CONTENT FROM (?:PAGE|PDF): .*? ---\n?/);
};

const extractKeywordsWithTfidf = (documents) => {
	const tfidf = new TfIdf();
	documents.forEach(doc => { tfidf.addDocument(doc.toLowerCase()); });
	const keywords = [];
	for (let i = 0; i < documents.length; i++) {
		tfidf.listTerms(i).slice(0, 10).forEach(term => {
			const existing = keywords.find(k => k.word === term.term);
			if (existing) { existing.score += term.tfidf; }
			else { keywords.push({ word: term.term, score: term.tfidf }); }
		});
	}
	return keywords.sort((a, b) => b.score - a.score).slice(0, 75).map(k => ({ word: k.word, count: k.score }));
};

const generateIntelligentSummary = (sentences, keywords) => {
	if (!sentences || sentences.length === 0) return "";
	const topKeywords = new Set(keywords.slice(0, 20).map(k => k.word));
	const scoredSentences = sentences.map(sentence => {
		let score = 0;
		const wordsInSentence = new Set(tokenizer.tokenize(sentence.text.toLowerCase()));
		wordsInSentence.forEach(word => { if (topKeywords.has(word)) { score++; } });
		return { ...sentence, score };
	});
	return scoredSentences.sort((a, b) => b.score - a.score).slice(0, 7).sort((a, b) => a.index - b.index).map(s => s.text).join(" ");
};

const analyzeContent = (content) => {
	try {
		const documents = splitContentIntoDocuments(content);
		const allSentenceTexts = documents.flatMap(doc => sentenceTokenizer.tokenize(doc));
		const sentences = allSentenceTexts.map((text, index) => ({
			text: text.trim(), index: index, wordCount: text.trim().split(/\s+/).length
		}));
		const keywords = extractKeywordsWithTfidf(documents);
		const summary = generateIntelligentSummary(sentences, keywords);
		return {
			summary, keywords, sentences, documents,
			contentStats: {
				wordCount: content.split(/\s+/).filter(Boolean).length,
				characterCount: content.length, sentenceCount: sentences.length
			}
		};
	} catch (error) {
		console.error("[Analyzer] Error during content analysis:", error);
		return { summary: "Analysis failed.", keywords: [], sentences: [], documents: [], contentStats: {} };
	}
};

const queryContent = async (query, websiteData) => {
	const { documents, sentences } = websiteData;
	const lowerQuery = query.toLowerCase();
	let contextForAI = "";
	if (documents && documents.length > 0) {
		const scoredDocs = documents.map((doc) => {
			let score = 0;
			const lowerDoc = doc.toLowerCase();
			if (lowerDoc.includes(lowerQuery)) score += 10;
			tokenizer.tokenize(lowerQuery).forEach(word => { if (lowerDoc.includes(word)) score += 1; });
			return { text: doc, score };
		}).sort((a, b) => b.score - a.score);
		const topDocs = scoredDocs.filter(d => d.score > 0).slice(0, 5);
		contextForAI = topDocs.length > 0 ? topDocs.map(d => d.text).join("\n\n---\n\n") : documents.slice(0, 3).join("\n\n---\n\n");
	} else { contextForAI = websiteData.content; }
	if (geminiModel) {
		try {
			const fullPrompt = `You are an expert Q&A assistant. Answer the user's question based ONLY on the provided text. Synthesize information to form a complete answer.\n\nUser's Question: "${query}"\n\nProvide a clear, well-formatted answer. If the information is not in the text, you MUST state: "This information is not available in the provided content."\n\nFOCUSED TEXT CONTENT:\n---\n${contextForAI.substring(0, 300000)}\n---\nANSWER:`;
			const result = await geminiModel.generateContent({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }] }, generationConfig, safetySettings);
			const text = result.response.text();
			if (text) return text;
		} catch (error) { console.error("[AI] Error querying Gemini:", error.message); }
	}
	const relevantSentences = sentences.filter(s => s.text.toLowerCase().includes(lowerQuery)).slice(0, 5);
	if (relevantSentences.length > 0) return "Local search found:\n\n" + relevantSentences.map(s => s.text).join("\n\n");
	return `Information about "${query}" was not found.`;
};

export default { analyzeContent, queryContent, processPdfWithOcr };