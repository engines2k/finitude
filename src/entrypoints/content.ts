const VIDEO_AGE_LIMIT_S = 86399
const subscriptionVideoCardQuery = "#primary ytd-item-section-renderer"
const gridVideoCardQuery = "#primary ytd-rich-grid-renderer ytd-rich-item-renderer"

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
	let subscriptionVideos = document.querySelectorAll(subscriptionVideoCardQuery);
	for (let video of subscriptionVideos) {
		checkIfVideoShouldBeHidden(video as HTMLElement, 'subscription');
	}

	let gridVideos = document.querySelectorAll(gridVideoCardQuery);
	for (let video of gridVideos) {
		checkIfVideoShouldBeHidden(video as HTMLElement, 'grid');
	}
}

function checkIfVideoShouldBeHidden(video: HTMLElement, viewType: 'subscription' | 'grid') {
	try {
		let age = getVideoAgeFromElement(video, viewType);

		if (age > VIDEO_AGE_LIMIT_S) {
			hideElement(video);
		}

	} catch (err) {
		console.log(`Err trying to hide: ${err}`);
	}
}

function getVideoAgeFromElement(video: HTMLElement, viewType: 'subscription' | 'grid') {
	if (viewType === 'subscription') {
		let metadata = video.querySelectorAll("#metadata-line .ytd-video-meta-block");
		if (!metadata)
			return 0;
		let raw_date = (metadata[3] as HTMLElement).innerText;
		return parseRawDate(raw_date);
	} else {
		let metadata = video.querySelectorAll("yt-content-metadata-view-model .yt-content-metadata-view-model__metadata-row");
		if (!metadata || metadata.length < 2)
			return 0;
		let raw_date = (metadata[1] as HTMLElement).innerText;
		let parts = raw_date.split('•');
		if (parts.length >= 2) {
			return parseRawDate(parts[1].trim());
		}
		return 0;
	}
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
	matches: ['https://www.youtube.com/*'],
	main() {
		limitube();

		const originalObserve = IntersectionObserver.prototype.observe;

		IntersectionObserver.prototype.observe = function() {
			if (window.location.pathname.includes('/feed/subscriptions')) {
				return;
			}
			return originalObserve.apply(this, arguments as any);
		};
	},
});
