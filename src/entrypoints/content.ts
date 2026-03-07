export default defineContentScript({
	matches: ['https://www.youtube.com/feed/subscriptions*', 'https://m.youtube.com/feed/subscriptions*'],
	main() {
		filterer.loadSettings();
		filterer.filterVideos();
	},
});

const filterer = videoFilterer();

browser.runtime.onMessage.addListener(
	function listenForMessage(message, _, __) {
		console.debug('[Content] Received message:', message);
		if (message.type === 'filterSettingsChanged') {
			filterer.loadSettings()
		}
	}
);


function videoFilterer() {
	const subscriptionVideoCardQuery = "#primary ytd-item-section-renderer"
	const gridVideoCardQuery = "#primary ytd-rich-item-renderer"
	const mobileSubscriptionVideoCardQuery = "ytm-rich-item-renderer"

	let settings = {
		ageLimitSeconds: 86399,
		hideMostRelevantSection: true,
		hideShortsSection: true,
	}

	let videoTypes = {
		subscription: subscriptionVideoCardQuery,
		grid: gridVideoCardQuery,
		mobile: mobileSubscriptionVideoCardQuery,
	};

	return {
		loadSettings,
		filterVideos,
	}

	async function loadSettings() {
		console.debug('[Content] Loading filter settings...');
		try {
			const response = await browser.runtime.sendMessage({ type: 'getFilterSettings' }) as { quantity: string, unit: string, hideMostRelevantSection: boolean, hideShortsSection: boolean } | undefined;
			console.debug('[Content] Response:', response);
			if (response) {
				settings.ageLimitSeconds = unitsToSeconds(parseInt(response.quantity), response.unit);
				settings.hideMostRelevantSection = response.hideMostRelevantSection;
				settings.hideShortsSection = response.hideShortsSection;
				console.debug('[Content] ageLimitSeconds updated to:', settings.ageLimitSeconds);
			}
		} catch (err) {
			console.error('[Content] Error loading settings:', err);
		}
	}


	function filterVideos() {
		new MutationObserver(handleVideoFeedMutation).observe(document.body, { childList: true, subtree: true })
	}

	function handleVideoFeedMutation() {
		let anyHidden = false;
		for (let [type, query] of Object.entries(videoTypes) as [keyof typeof videoTypes, string][]) {
			let matches = document.querySelectorAll(query)
			console.log(query, matches)
			for (let video of matches)
				if (videoTooOld(video as HTMLElement, type)) {
					video.remove()
					anyHidden = true;
				}
		}
		if (anyHidden) stopFeedContinuation();

		if (settings.hideMostRelevantSection)
			hideSection("Most relevant")

		if (settings.hideShortsSection)
			hideSection("Shorts")
	}

	function hideSection(name: string) {
		let sectionsQuery = "ytd-rich-section-renderer, ytm-rich-section-renderer"
		let sections = document.querySelectorAll(sectionsQuery)
		for (let section of sections)
			if (getSectionTitle(section as HTMLElement) == name)
				section.remove()
	}

	function getSectionTitle(section: HTMLElement) {
		let titleElement = section.querySelector("#rich-shelf-header #title, .rich-shelf-header .rich-shelf-title span")
		let title = titleElement?.textContent
		console.log(`title is ${title}`)
		return title
	}

	function videoTooOld(video: HTMLElement, viewType: keyof typeof videoTypes) {
		const age = getVideoAge(video, viewType);
		if (age >= settings.ageLimitSeconds)
			return true
		return false
	}

	function stopFeedContinuation() {
		const query = "ytd-continuation-item-renderer, ytm-continuation-item-renderer"
		const continuator = document.querySelector(query)
		console.debug('continuator: ', continuator);
		continuator?.remove()
	}

	function getVideoAge(video: HTMLElement, viewType: keyof typeof videoTypes) {
		let metadata;
		let rawDate;

		switch (viewType) {
			case 'mobile': {
				metadata = video.querySelectorAll(".YtmBadgeAndBylineRendererItemByline");
				rawDate = (metadata?.[2] as HTMLElement)?.innerText;
				console.log(metadata, rawDate)
				break;
			}

			case 'subscription': {
				metadata = video.querySelectorAll("#metadata-line .ytd-video-meta-block");
				rawDate = (metadata?.[3] as HTMLElement)?.innerText;
				break;
			}
			case 'grid': {
				metadata = video.querySelectorAll("yt-content-metadata-view-model .yt-content-metadata-view-model__metadata-row")[1];
				rawDate = (metadata?.children?.[2] as HTMLElement)?.innerText;
				break;
			}
		}


		function getQuantityAndUnit(date: string) {
			let parts = date.split(' ');
			parts = parts.filter((part) => part != "Streamed" && part != "ago");
			return {
				quantity: Number(parts[0]),
				unit: parts[1]
			}
		}

		if (!rawDate)
			return 0;
		const parsedDate = getQuantityAndUnit(rawDate);
		const videoAge = unitsToSeconds(parsedDate.quantity, parsedDate.unit)
		return videoAge
	}

	function unitsToSeconds(quantity: number, unit: string) {
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

		let multiplier = multiplierUnits[unit];
		return multiplier * quantity;
	}
}


