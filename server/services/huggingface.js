import axios from "axios";

/**
 * Service to interact with Hugging Face's inference API
 * Uses free tier access for question answering and text generation
 */
import dotenv from "dotenv";
dotenv.config();
class HuggingFaceService {
	constructor() {
		// Base URL for Hugging Face Inference API
		this.apiUrl = "https://api-inference.huggingface.co/models";

		// Default models for various tasks
		this.qaModel = "deepset/roberta-base-squad2";
		this.textGenModel = "gpt2";
		this.summaryModel = "facebook/bart-large-cnn";
		this.keywordModel = "facebook/bart-large-mnli";

		// Get HF token from environment variables
		const HF_TOKEN = process.env.HUGGING_FACE_TOKEN || "";

		// Headers for API requests
		this.headers = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${HF_TOKEN}`,
		};
	}

	/**
	 * Set a custom question answering model
	 * @param {string} modelName - The Hugging Face model name/path
	 */
	setQuestionAnsweringModel(modelName) {
		if (modelName && typeof modelName === "string") {
			this.qaModel = modelName;
		}
	}

	/**
	 * Set a custom text generation model
	 * @param {string} modelName - The Hugging Face model name/path
	 */
	setTextGenerationModel(modelName) {
		if (modelName && typeof modelName === "string") {
			this.textGenModel = modelName;
		}
	}

	/**
	 * Set a custom summarization model
	 * @param {string} modelName - The Hugging Face model name/path
	 */
	setSummarizationModel(modelName) {
		if (modelName && typeof modelName === "string") {
			this.summaryModel = modelName;
		}
	}

	/**
	 * Set a custom keyword extraction model
	 * @param {string} modelName - The Hugging Face model name/path
	 */
	setKeywordExtractionModel(modelName) {
		if (modelName && typeof modelName === "string") {
			this.keywordModel = modelName;
		}
	}

	/**
	 * Ask a specific question about the content
	 * @param {string} question - The question to ask
	 * @param {string} context - The content to search for answers
	 * @param {string} [modelName] - Optional custom model to use
	 * @returns {Promise<Object>} - The answer object
	 */
	async askQuestion(question, context, modelName) {
		try {
			// Use provided model or default
			const model = modelName || this.qaModel;

			// Limit context size to avoid token limits
			const truncatedContext = context.substring(0, 10000);

			const response = await axios.post(
				`${this.apiUrl}/${model}`,
				{
					inputs: {
						question,
						context: truncatedContext,
					},
				},
				{ headers: this.headers }
			);

			return {
				answer: response.data.answer || "No specific answer found.",
				score: response.data.score || 0,
				start: response.data.start,
				end: response.data.end,
				modelUsed: model,
			};
		} catch (error) {
			console.error("Error querying Hugging Face:", error);
			if (error.response && error.response.status === 429) {
				return {
					answer: "Rate limit exceeded. Please try again later.",
					error: "RATE_LIMIT",
				};
			}
			return {
				answer: "Failed to get answer from model.",
				error: error.message,
			};
		}
	}

	/**
	 * Generate text based on a prompt derived from content
	 * @param {string} prompt - The prompt for text generation
	 * @param {string} [modelName] - Optional custom model to use
	 * @param {Object} [parameters] - Optional generation parameters
	 * @returns {Promise<Object>} - Generated text
	 */
	async generateText(prompt, modelName, parameters = {}) {
		try {
			// Use provided model or default
			const model = modelName || this.textGenModel;

			// Limit prompt size
			const truncatedPrompt = prompt.substring(0, 1000);

			// Merge default parameters with any provided ones
			const genParams = {
				max_new_tokens: 100,
				temperature: 0.7,
				top_k: 50,
				top_p: 0.95,
				...parameters,
			};

			const response = await axios.post(
				`${this.apiUrl}/${model}`,
				{
					inputs: truncatedPrompt,
					parameters: genParams,
				},
				{ headers: this.headers }
			);

			return {
				generatedText: response.data[0]?.generated_text || "No text generated.",
				modelUsed: model,
			};
		} catch (error) {
			console.error("Error generating text with Hugging Face:", error);
			if (error.response && error.response.status === 429) {
				return {
					generatedText: "Rate limit exceeded. Please try again later.",
					error: "RATE_LIMIT",
				};
			}
			return {
				generatedText: "Failed to generate text.",
				error: error.message,
			};
		}
	}

	/**
	 * Summarize content using a summarization model
	 * @param {string} content - The content to summarize
	 * @param {string} [modelName] - Optional custom model to use
	 * @param {Object} [parameters] - Optional summarization parameters
	 * @returns {Promise<Object>} - The summary
	 */
	async summarizeContent(content, modelName, parameters = {}) {
		try {
			// Use provided model or default
			const model = modelName || this.summaryModel;

			// Limit content size for summarization
			const truncatedContent = content.substring(0, 5000);

			// Merge default parameters with any provided ones
			const summaryParams = {
				max_length: 150,
				min_length: 30,
				...parameters,
			};

			const response = await axios.post(
				`${this.apiUrl}/${model}`,
				{
					inputs: truncatedContent,
					parameters: summaryParams,
				},
				{ headers: this.headers }
			);

			return {
				summary: response.data[0]?.summary_text || "No summary generated.",
				modelUsed: model,
			};
		} catch (error) {
			console.error("Error summarizing with Hugging Face:", error);
			if (error.response && error.response.status === 429) {
				return {
					summary: "Rate limit exceeded. Please try again later.",
					error: "RATE_LIMIT",
				};
			}
			return {
				summary: "Failed to generate summary.",
				error: error.message,
			};
		}
	}

	/**
	 * Extract keywords using a keyword extraction model
	 * @param {string} content - The content to extract keywords from
	 * @param {string} [modelName] - Optional custom model to use
	 * @param {string[]} [candidateLabels] - Optional custom labels
	 * @returns {Promise<Object>} - The extracted keywords
	 */
	async extractKeywords(content, modelName, candidateLabels) {
		try {
			// Use provided model or default
			const model = modelName || this.keywordModel;

			// Common topics/keywords to classify against, or use provided ones
			const labels = candidateLabels || [
				"technology",
				"business",
				"science",
				"health",
				"education",
				"finance",
				"marketing",
				"sports",
				"entertainment",
				"politics",
				"environment",
				"travel",
			];

			// Limit content size
			const truncatedContent = content.substring(0, 5000);

			const response = await axios.post(
				`${this.apiUrl}/${model}`,
				{
					inputs: truncatedContent,
					parameters: {
						candidate_labels: labels,
					},
				},
				{ headers: this.headers }
			);

			// Format results as keywords with scores
			const keywords = [];
			if (response.data.labels && response.data.scores) {
				for (let i = 0; i < response.data.labels.length; i++) {
					keywords.push({
						word: response.data.labels[i],
						score: response.data.scores[i],
					});
				}

				// Sort by score
				keywords.sort((a, b) => b.score - a.score);
			}

			return {
				keywords,
				modelUsed: model,
			};
		} catch (error) {
			console.error("Error extracting keywords with Hugging Face:", error);
			if (error.response && error.response.status === 429) {
				return {
					keywords: [],
					error: "RATE_LIMIT",
				};
			}
			return {
				keywords: [],
				error: error.message,
			};
		}
	}
}

export default new HuggingFaceService();
