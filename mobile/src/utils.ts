export const parseURL = (
	urlString: string
): {
	protocol: string;
	hostname: string;
	pathname: string;
	search: string;
	hash: string;
} | null => {
	try {
		const url = new URL(urlString);
		return {
			protocol: url.protocol,
			hostname: url.hostname,
			pathname: url.pathname,
			search: url.search,
			hash: url.hash,
		};
	} catch (urlError) {
		try {
			const protocolMatch = urlString.match(/^([^:]+:)\/\//);
			const protocol = protocolMatch ? protocolMatch[1] : "";

			let restUrl = urlString;
			if (protocol) {
				restUrl = urlString.substring(protocol.length + 2);
			}

			let hostname = restUrl;
			let pathname = "";
			let search = "";
			let hash = "";

			const hashIndex = restUrl.indexOf("#");
			if (hashIndex !== -1) {
				hash = restUrl.substring(hashIndex);
				hostname = restUrl.substring(0, hashIndex);
			}

			const searchIndex = hostname.indexOf("?");
			if (searchIndex !== -1) {
				search = hostname.substring(searchIndex);
				hostname = hostname.substring(0, searchIndex);
			}

			const pathnameIndex = hostname.indexOf("/");
			if (pathnameIndex !== -1) {
				pathname = hostname.substring(pathnameIndex);
				hostname = hostname.substring(0, pathnameIndex);
			}

			return {
				protocol,
				hostname,
				pathname,
				search,
				hash,
			};
		} catch (regexError) {
			return null;
		}
	}
};

export const isValidHttpURL = (
	input: string
): { valid: boolean; parsedUrl?: any } => {
	const trimmedInput = input.trim();
	if (!trimmedInput) {
		return { valid: false };
	}

	let urlToTest = trimmedInput;

	if (!/^(https?:)?\/\//.test(urlToTest)) {
		urlToTest = "https://" + urlToTest;
	}

	try {
		const parsedUrl = parseURL(urlToTest);
		if (
			parsedUrl &&
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

// Educational TLDs
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
	".edu.tw",
	".edu.sg",
	".edu.in",
	".edu.com",
	".edu.ac",
	".ac.in",
	".ac.com",
	".edu.jp",
	".co.in",
	".nic.in",
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

		// Check for direct educational TLDs
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
