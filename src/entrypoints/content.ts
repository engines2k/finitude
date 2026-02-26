const subscriptionVideoCardQuery = "#primary ytd-item-section-renderer"
const gridVideoCardQuery = "#primary ytd-rich-grid-renderer ytd-rich-item-renderer"
const continuationLoaderQuery = "#primary ytd-ghost-grid-renderer"

const mobileSubscriptionVideoCardQuery = ".YtmBrowseHost ytm-item-section-renderer ytm-video-with-context-renderer"

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

let ageLimitSeconds = 86399

async function loadFilterSettings() {
	console.log('[Content] Loading filter settings...');
	try {
		const response = await browser.runtime.sendMessage({ type: 'getFilterSettings' }) as { quantity: string, unit: string } | undefined;
		console.log('[Content] Response:', response);
		if (response) {
			ageLimitSeconds = unitsToSeconds(parseInt(response.quantity), response.unit);
			console.log('[Content] ageLimitSeconds updated to:', ageLimitSeconds);
		}
	} catch (err) {
		console.error('[Content] Error loading settings:', err);
	}
}

browser.runtime.onMessage.addListener((message, _, sendResponse) => {
	console.log('[Content] Received message:', message);
	if (message.type === 'filterSettingsChanged') {
		loadFilterSettings();
	}
});

function observeVideos() {
	new MutationObserver(hideOldVideos).observe(document.body, { childList: true, subtree: true });
}

function hideOldVideos() {
	let subscriptionVideos = document.querySelectorAll(subscriptionVideoCardQuery);
	console.log('[Content] Desktop subscription videos found:', subscriptionVideos.length);
	for (let video of subscriptionVideos) {
		checkIfVideoShouldBeHidden(video as HTMLElement, 'subscription');
	}

	let gridVideos = document.querySelectorAll(gridVideoCardQuery);
	console.log('[Content] Desktop grid videos found:', gridVideos.length);
	for (let video of gridVideos) {
		checkIfVideoShouldBeHidden(video as HTMLElement, 'grid');
	}

	let mobileVideos = document.querySelectorAll(mobileSubscriptionVideoCardQuery);
	console.log('[Content] Mobile videos found:', mobileVideos.length);
	for (let video of mobileVideos) {
		checkIfVideoShouldBeHidden(video as HTMLElement, 'mobile');
	}

	let loaders = document.querySelectorAll(continuationLoaderQuery);
	for (let loader of loaders) {
		hideElement(loader as HTMLElement);
	}
}

function checkIfVideoShouldBeHidden(video: HTMLElement, viewType: 'subscription' | 'grid' | 'mobile') {
	try {
		let age = getVideoAgeFromElement(video, viewType);
		console.log(`[Content] ${viewType} video age:`, age, 'limit:', ageLimitSeconds);

		if (age >= ageLimitSeconds) {
			hideElement(video);
			console.log('[Content] Hid video');
		}

	} catch (err) {
		console.log(`Err trying to hide: ${err}`);
	}
}

function getVideoAgeFromElement(video: HTMLElement, viewType: 'subscription' | 'grid' | 'mobile') {
	if (viewType === 'mobile') {
		const metadata = video.querySelectorAll(".YtmBadgeAndBylineRendererItemByline");
		console.log('[Content] Mobile metadata:', metadata.length);
		if (!metadata || metadata.length < 3)
			return 0;
		let raw_date = (metadata[2] as HTMLElement).innerText;
		console.log('[Content] Mobile raw_date:', raw_date);
		return parseRawDate(raw_date);
	} else if (viewType === 'subscription') {
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
	return unitsToSeconds(parsed.quantity, parsed.unit)
}

function getQuantityAndUnit(date: string) {
	let parts = date.split(' ');
	parts = parts.filter((part) => part != "Streamed" && part != "ago");
	return {
		quantity: Number(parts[0]),
		unit: parts[1]
	}
}

function unitsToSeconds(quantity: number, unit: string) {
	let multiplier = multiplierUnits[unit];
	return multiplier * quantity;
}

function hideElement(element: HTMLElement) {
	element.style.display = "none";
}

export default defineContentScript({
	matches: ['https://www.youtube.com/*'],
	main() {
		loadFilterSettings();
		observeVideos();

		const originalObserve = IntersectionObserver.prototype.observe;

		IntersectionObserver.prototype.observe = function() {
			if (window.location.pathname.includes('/feed/subscriptions')) {
				return;
			}
			return originalObserve.apply(this, arguments as any);
		};
	},
});
