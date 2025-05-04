import mongoose from "mongoose";

const keywordSchema = new mongoose.Schema({
	word: {
		type: String,
		required: true,
	},
	count: {
		type: Number,
		required: true,
	},
});

const websiteSchema = new mongoose.Schema({
	url: {
		type: String,
		required: true,
		trim: true,
	},
	title: {
		type: String,
		required: true,
		trim: true,
	},
	content: {
		type: String,
		required: true,
	},
	summary: {
		type: String,
		required: true,
	},
	keywords: [keywordSchema],
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

// Create a compound index for faster queries and to ensure uniqueness
websiteSchema.index({ url: 1 });

const Website = mongoose.model("Website", websiteSchema);

export default Website;
