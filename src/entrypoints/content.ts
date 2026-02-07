const VIDEO_AGE_LIMIT_S = 86399
const videoCardElementQuery = "#primary ytd-item-section-renderer"

const multiplierUnits: Record<string, number> = {
	"second": 1,
	"seconds": 1,
	"minute": 60,
	"minutes": 60,
	"hour": 3600,
	"hours": 3600,
	"day": 86400,
	"days": 86400,
	"week": 604800,
	"weeks": 604800,
	"month": 2592000,
	"months": 2592000,
	"year": 31536000,
	"years": 31536000
}

function limitube() {
	new MutationObserver(hideOldVideos).observe(document.body, { childList: true, subtree: true });
}

function hideOldVideos() {
	let videos = document.querySelectorAll(videoCardElementQuery);
	for (let video of videos) {
		checkIfVideoShouldBeHidden(video as HTMLElement);
	}
}

function checkIfVideoShouldBeHidden(video: HTMLElement) {
	try {
		let age = getVideoAgeFromElement(video);

		if (age > VIDEO_AGE_LIMIT_S) {
			hideElement(video);
		}

	} catch (err) {
		console.log(`Err trying to hide: ${err}`);
	}
}

function getVideoAgeFromElement(video: HTMLElement) {
	let metadata = video.querySelectorAll("#metadata-line .ytd-video-meta-block");
	if (!metadata)
		return 0;
		let raw_date = (metadata[3] as HTMLElement).innerText;
	return parseRawDate(raw_date);
}

function parseRawDate(date: string) {
	let parsed = getQuantityAndUnit(date);
	let multiplier = multiplierUnits[parsed.unit];
	return parsed.quantity * multiplier;
}

function getQuantityAndUnit(date: string) {
	let parts = date.split(' ');
	parts = parts.filter((part) => part != "Streamed" && part != "ago");
	return {
		quantity: Number(parts[0]),
		unit: parts[1]
	}
}

function hideElement(element: HTMLElement) {
	element.style.display = "none";
}
export default defineContentScript({
	matches: ['*://*.google.com/*'],
	main() {

		limitube();

		const originalObserve = IntersectionObserver.prototype.observe;

		IntersectionObserver.prototype.observe = function() {
			if (window.location.pathname.includes('/feed/subscriptions')) {
				return;
			}
			return originalObserve.apply(this, arguments as any);
		};

		const originalFetch = window.fetch;
		window.fetch = function(...args) {
			const url = args[0];
			if (typeof url === 'string' && url.includes('browse') && url.includes('continuation')) {
				return Promise.reject(new Error('Blocked'));
			}
			return originalFetch.apply(this, args);
		};

	},
});
