import mongoose from 'mongoose';

const websiteSchema = new mongoose.Schema({
	url: { type: String, required: true, unique: true, trim: true, index: true },
	title: { type: String, required: true, trim: true },
	content: { type: String, required: true },
	summary: { type: String, default: '' },
	keywords: [{ word: String, count: Number }],
	sentences: [{ text: String, index: Number, wordCount: Number }],
	stats: {
		htmlPages: { type: Number, default: 0 },
		pdfDocuments: { type: Number, default: 0 },
		totalPages: { type: Number, default: 0 },
		wordCount: { type: Number, default: 0 },
		characterCount: { type: Number, default: 0 },
		sentenceCount: { type: Number, default: 0 }
	},
	metadata: {
		scrapingDuration: Number,
		lastScrapedAt: { type: Date, default: Date.now },
		scrapingErrors: [{ url: String, error: String }],
		contentType: [String]
	}
}, { timestamps: true });

websiteSchema.index({ title: 'text', 'keywords.word': 'text' });

websiteSchema.pre('save', function (next) {
	if (this.isNew || this.isModified('stats')) {
		const contentTypes = [];
		if (this.stats.htmlPages > 0) contentTypes.push('html');
		if (this.stats.pdfDocuments > 0) contentTypes.push('pdf');
		this.metadata.contentType = contentTypes;
	}
	this.metadata.lastScrapedAt = new Date();
	next();
});

const Website = mongoose.model('Website', websiteSchema);
export default Website;