export default defineContentScript({
	matches: ['https://www.youtube.com/*', 'https://m.youtube.com/*'],
	main() {
		runFilter();
		new MutationObserver(runFilter).observe(document.body, { childList: true, subtree: true });
	},
});

const isDev = import.meta.env.DEV;


function runFilter() {
	if (!filterer.shouldRun()) {
		filterer.resumeFeedContinuation();
		return;
	}
	filterer.loadSettings();
	filterer.filterVideos();
}

const filterer = videoFilterer();

browser.runtime.onMessage.addListener(
	function listenForMessage(message, _, __) {
		if (message.type === 'filterSettingsChanged') {
			filterer.loadSettings();
		}
	}
);


function videoFilterer() {
	const subscriptionVideoCardQuery = "#primary ytd-item-section-renderer";
	const gridVideoCardQuery = "#contents ytd-rich-item-renderer";
	const mobileSubscriptionVideoCardQuery = "ytm-rich-item-renderer";
	const contQuery = "ytd-continuation-item-renderer, ytm-continuation-item-renderer";
	let videoObserver: MutationObserver | null = null;

	let settings = {
		power: true,
		ageLimitSeconds: 86399,
		hideMostRelevantSection: true,
		hideShortsSection: true,
	};

	let videoTypes = {
		subscription: subscriptionVideoCardQuery,
		grid: gridVideoCardQuery,
		mobile: mobileSubscriptionVideoCardQuery,
	};

	return {
		shouldRun,
		loadSettings,
		filterVideos,
		stopFeedContinuation,
		resumeFeedContinuation,
	};

	async function loadSettings() {
		try {
			const response = await browser.runtime.sendMessage({ type: 'getFilterSettings' }) as { power: boolean, quantity: string, unit: string, hideMostRelevantSection: boolean, hideShortsSection: boolean } | undefined;
			if (response) {
				settings.power = response.power;
				settings.ageLimitSeconds = unitsToSeconds(parseInt(response.quantity), response.unit);
				settings.hideMostRelevantSection = response.hideMostRelevantSection;
				settings.hideShortsSection = response.hideShortsSection;
			}
		} catch (err) {
			console.error('[Content] Error loading settings:', err);
		}
	}

	function filterVideos() {
		videoObserver?.disconnect();
		videoObserver = new MutationObserver((mutations, observer) => {
			handleVideoFeedMutation();
		});
		videoObserver.observe(document.body, { childList: true, subtree: true });

		handleVideoFeedMutation();
	}


	function shouldRun(): boolean {
		let path = window.location.pathname;
		isDev && console.log(`path ${path}`)
		return path.includes('/feed/subscriptions') && settings.power;
	}


	function handleVideoFeedMutation() {
		if (!shouldRun())
			return;
		let anyHidden = false;
		for (let [type, query] of Object.entries(videoTypes) as [keyof typeof videoTypes, string][]) {
			let matches = document.querySelectorAll(query)
			isDev && console.log(`evaluating ${matches.length} matches`);
			for (let video of matches) {
				if (videoTooOld(video as HTMLElement, type)) {
					video.remove()
					anyHidden = true;
				}
			}
		}
		if (anyHidden) stopFeedContinuation();
		if (settings.hideMostRelevantSection)
			hideSection("Most relevant");
		if (settings.hideShortsSection)
			hideSection("Shorts");
	}

	function hideSection(name: string) {
		let sectionsQuery = "ytd-rich-section-renderer, ytm-rich-section-renderer"
		let sections = document.querySelectorAll(sectionsQuery)
		for (let section of sections)
			if (getSectionTitle(section as HTMLElement) == name)
				section.remove();
	}

	function getSectionTitle(section: HTMLElement) {
		let titleElement = section.querySelector("#rich-shelf-header #title, .rich-shelf-header .rich-shelf-title span")
		return titleElement?.textContent;
	}

	function videoTooOld(video: HTMLElement, viewType: keyof typeof videoTypes) {
		const age = getVideoAge(video, viewType);
		isDev && console.log(`${video} has age of ${age}`);
		return age >= settings.ageLimitSeconds;
	}

	function stopFeedContinuation() {
		const continuator = document.querySelector(contQuery) as HTMLElement
		if (continuator)
			continuator.style.display = 'none';
	}

	function resumeFeedContinuation() {
		const continuator = document.querySelector(contQuery) as HTMLElement
		if (continuator)
			continuator.style.display = 'block';
	}

	function getVideoAge(video: HTMLElement, viewType: keyof typeof videoTypes) {
		let metadataHtml: string | null = null;

		switch (viewType) {
			case 'mobile': {
				const metadata = video.querySelectorAll(".YtmBadgeAndBylineRendererItemByline");
				metadataHtml = (metadata?.[2] as HTMLElement)?.innerHTML;
				break;
			}

			case 'subscription': {
				const metadata = video.querySelectorAll("#metadata-line .ytd-video-meta-block");
				metadataHtml = (metadata?.[3] as HTMLElement)?.innerHTML;
				break;
			}
			case 'grid': {
				const metadata = video.querySelectorAll(".ytContentMetadataViewModelMetadataRow")[1];
				metadataHtml = metadata?.innerHTML || null;
				break;
			}
		}

		if (!metadataHtml)
			return 0;

		const match = metadataHtml.match(/([\d,]+)\s*(second|minute|hour|day|week|month|year)s?\s*(?:ago|streaming)/i);
		if (!match)
			return 0;

		return unitsToSeconds(Number(match[1].replace(',', '')), match[2]);
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
		};

		let multiplier = multiplierUnits[unit];
		return multiplier * quantity;
	}
}
