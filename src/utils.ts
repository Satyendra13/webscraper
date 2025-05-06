export const isValidHttpURL = (
	input: string
): { valid: boolean; parsedUrl?: URL } => {
	const trimmedInput = input.trim();
	if (!trimmedInput) {
		return { valid: false };
	}

	let urlToTest = trimmedInput;

	if (!/^(https?:)?\/\//.test(urlToTest)) {
		urlToTest = "https://" + urlToTest;
	}

	try {
		const parsedUrl = new URL(urlToTest);
		if (
			(parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") &&
			parsedUrl.hostname &&
			parsedUrl.hostname.length > 0 &&
			parsedUrl.hostname.includes(".")
		) {
			return { valid: true, parsedUrl };
		}
		return { valid: false };
	} catch (err) {
		return { valid: false };
	}
};

const educationalTlds = new Set([
	".edu",
	".edu.us",
	".edu.ca",
	".edu.mx",
	".ac.uk",
	".sch.uk",
	".edu.fr",
	".edu.de",
	".edu.es",
	".edu.it",
	".edu.pl",
	".edu.ru",
	".edu.ie",
	".ac.at",
	".edu.au",
	".ac.nz",
	".edu.cn",
	".edu.hk",
	".nic.in",
	".edu.tw",
	".edu.sg",
	".edu.in",
	".edu.com",
	".edu.ac",
	".ac.in",
	".ac.com",
	".edu.jp",
	".co.in",
	".ac.jp",
	".edu.kr",
	".ac.kr",
	".edu.th",
	".edu.my",
	".edu.ph",
	".edu.vn",
	".edu.pk",
	".edu.sa",
	".edu.ae",
	".edu.il",
	".ac.il",
	".edu.tr",
	".edu.za",
	".ac.za",
	".edu.eg",
	".edu.ng",
	".edu.gh",
	".edu.ke",
	".ac.ke",
]);

export const validateURL = (input: string): boolean => {
	const validationResult = isValidHttpURL(input);

	if (validationResult.valid && validationResult.parsedUrl) {
		const hostname = validationResult.parsedUrl.hostname.toLowerCase();

		for (const tld of educationalTlds) {
			if (hostname.endsWith(tld)) {
				return true;
			}
		}

		const educationalKeywords = [
			"university",
			"college",
			"school",
			"institute",
			"academy",
			"polytechnic",
		];
		for (const keyword of educationalKeywords) {
			if (hostname.includes(keyword)) {
				return true;
			}
		}
	}
	return false;
};
