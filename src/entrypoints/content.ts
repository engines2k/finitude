export default defineContentScript({
	matches: ['https://www.youtube.com/*', 'https://m.youtube.com/*'],
	main() {
		isDev && console.log('[finitude] starting');
		filterer.loadSettings();
		window.addEventListener('yt-navigate-finish', handleNavigation);
		const pathObserver = new MutationObserver(() => {
			const currentPath = window.location.href;
			if (currentPath !== lastPath) {
				lastPath = currentPath;
				handleNavigation();
			}
		});
		pathObserver.observe(document.body, { childList: true, subtree: true });
	},
});

let lastPath = '';
const isDev = import.meta.env.DEV;
const subsQuery = `ytd-browse[page-subtype="subscriptions"][role="main"] #primary ytd-rich-grid-renderer, ytm-browse .tab-content[tab-identifier="FEsubscriptions"] ytm-rich-grid-renderer`
const filterer = videoFilterer();
let observer: MutationObserver | null = null;

function handleNavigation() {
	isDev && console.log('[finitude] caught page navigation');
	tryObserve();
	const tryFilter = () => {
		const subsPageEl = document.querySelector(subsQuery);
		isDev && console.log({ subsPageEl });
		if (subsPageEl) {
			filterer.filterVideos(subsPageEl);
		} else {
			requestAnimationFrame(tryFilter);
		}
	};
	tryFilter();
}

function tryObserve() {
	isDev && console.log("observing");
	observer && observer.disconnect();
	if (!filterer.shouldRun()) return;
	let subsPage = document.querySelector(subsQuery);
	if (subsPage) {
		isDev && console.log(`[finitude] Subs page element: ${subsPage}`);
		observer = new MutationObserver(runFilter);
		observer.observe(subsPage, { childList: true, subtree: true });
	} else {
		isDev && console.log("[finitude] Couldn't find subs page element, trying again later");
		setTimeout(() => requestAnimationFrame(tryObserve), 250);
	}
};

function runFilter(records: MutationRecord[]) {
	filterer.loadSettings();
	for (const record of records) {
		if (record.type != "childList") continue;
		if (!filterer.shouldRun()) {
			filterer.resumeFeedContinuation();
			continue;
		}
		filterer.filterVideos(record.addedNodes);
	}
}


browser.runtime.onMessage.addListener(
	function listenForMessage(message, _, __) {
		if (message.type === 'filterSettingsChanged') {
			filterer.loadSettings();
		}
	}
);


function videoFilterer() {
	const QUERIES = {
		VIDEO_SUBSCRIPTION: "#primary ytd-item-section-renderer",
		VIDEO_SUBSCRIPTION_GRID: "#contents ytd-rich-item-renderer",
		VIDEO_SUBSCRIPTION_MOBILE: "ytm-rich-item-renderer",
		PROGRESS_VIDEO: ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, .YtmThumbnailOverlayResumePlaybackRendererThumbnailOverlayResumePlaybackProgress",
		CONTINUATOR_FEED: `ytd-continuation-item-renderer, ytm-continuation-item-renderer`,
	} as const;

	let settings = {
		power: true,
		ageLimitSeconds: 86399,
		hideMostRelevantSection: true,
		hideShortsSection: true,
		hideWatchedVideos: false,
		hideVideoPercentage: .75,
	};

	let videoTypes = {
		subscription: QUERIES.VIDEO_SUBSCRIPTION,
		grid: QUERIES.VIDEO_SUBSCRIPTION_GRID,
		mobile: QUERIES.VIDEO_SUBSCRIPTION_MOBILE,
	};

	return {
		shouldRun,
		loadSettings,
		filterVideos,
		stopFeedContinuation,
		resumeFeedContinuation,
	};

	function shouldRun(): boolean {
		let path = window.location.pathname;
		return path.includes('/feed/subscriptions') && settings.power;
	}

	function filterVideos(target: NodeList | Element) {
		if (target instanceof Element) {
			let videos = target.querySelectorAll(
				Object.values(videoTypes).join(', ')
			);
			_handleFeedMutation(videos)
		} else {
			_handleFeedMutation(target as NodeList);
		}
	}

	async function loadSettings() {
		try {
			const response = await browser.runtime.sendMessage({ type: 'getFilterSettings' }) as { power: boolean, quantity: string, unit: string, hideMostRelevantSection: boolean, hideShortsSection: boolean, hideWatchedVideos: boolean, hideVideoPercentage: number } | undefined;
			if (response) {
				settings.power = response.power;
				settings.ageLimitSeconds = _unitsToSeconds(parseInt(response.quantity), response.unit);
				settings.hideMostRelevantSection = response.hideMostRelevantSection;
				settings.hideShortsSection = response.hideShortsSection;
				settings.hideWatchedVideos = response.hideWatchedVideos;
				settings.hideVideoPercentage = response.hideVideoPercentage;
			}
		} catch (err) {
			console.error('[Content] Error loading settings:', err);
		}
	}

	function stopFeedContinuation() {
		isDev && console.log("stopping continuation...");
		const subsFeed = document.querySelector(subsQuery);
		const continuator = subsFeed?.querySelector(QUERIES.CONTINUATOR_FEED) as HTMLElement;
		isDev && console.log({ continuator });
		if (continuator)
			continuator.style.display = 'none';
		else {
			console.error(`[finitude]: Unable to locate continuation element`);
			isDev && console.log({ subsFeed, continuator })
		}
	}

	function resumeFeedContinuation() {
		const subsFeed = document.querySelector(subsQuery);
		const continuator = subsFeed?.querySelector(QUERIES.CONTINUATOR_FEED) as HTMLElement;
		if (continuator)
			continuator.style.display = 'block';
		else {
			console.error(`[finitude]: Unable to locate continuation element`);
			isDev && console.log({ subsFeed, continuator })
		}
	}

	function _handleFeedMutation(nodes: NodeList) {
		if (!shouldRun())
			return;
		let oldHidden = false;
		for (let [type, query] of Object.entries(videoTypes) as [keyof typeof videoTypes, string][]) {
			let newVideos = Array.from(nodes).filter(el => el instanceof Element && el.matches(query));
			isDev && console.log(`Evaluating ${newVideos.length} video matches: ${newVideos}`);
			for (let video of newVideos as Element[]) {
				if (_videoTooOld(video as HTMLElement, type)) {
					video.remove();
					oldHidden = true;
				}
				if (settings.hideWatchedVideos) {
					if (_videoWatched(video as HTMLElement)) {
						video.remove();
					} else if (!video.querySelector(QUERIES.PROGRESS_VIDEO)) {
						_observeVideoProgress(video as HTMLElement);
					}
				}
			}
		}
		if (oldHidden) stopFeedContinuation();
		if (settings.hideMostRelevantSection)
			_hideSection("Most relevant");
		if (settings.hideShortsSection)
			_hideSection("Shorts");
	}

	function _hideSection(name: string) {
		const sectionsQuery = "ytd-rich-section-renderer, ytm-rich-section-renderer"
		isDev && console.log(`[finitude] hiding section ${name}`);
		let sections = document.querySelectorAll(sectionsQuery)
		for (let section of sections) {
			const titleElement = section.querySelector("#rich-shelf-header #title, .rich-shelf-header .rich-shelf-title span, .reel-shelf-title span");
			if (titleElement?.textContent == name)
				section.remove();
		}
	}

	function _getSectionTitle(section: HTMLElement) {
		let titleElement = section.querySelector("#rich-shelf-header #title, .rich-shelf-header .rich-shelf-title span")
		return titleElement?.textContent;
	}

	function _videoTooOld(video: HTMLElement, viewType: keyof typeof videoTypes) {
		const age = _getVideoAge(video, viewType);
		isDev && console.log(`${video.querySelector('.ytLockupMetadataViewModelTitle span')?.textContent} has age of ${age} seconds`);
		return age >= settings.ageLimitSeconds;
	}

	function _getVideoAge(video: HTMLElement, viewType: keyof typeof videoTypes) {
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

		return _unitsToSeconds(Number(match[1].replace(',', '')), match[2]);
	}

	function _videoWatched(video: HTMLElement): boolean {
		const progressBar = video.querySelector(QUERIES.PROGRESS_VIDEO);
		isDev && console.log(`[finitude] checking progress for ${video}, progress bar: ${progressBar}`);
		if (!progressBar) return false;
		const progressWidth = (progressBar as HTMLElement).style.width;
		const progress = parseFloat(progressWidth) / 100;
		isDev && console.log({ progressWidth, video, progress })
		if (progress >= settings.hideVideoPercentage) {
			isDev && console.log(`Hid watched video: ${video}`);
			return true
		}
		return false;
	}

	function _observeVideoProgress(video: HTMLElement) {
		const observer = new MutationObserver((mutations, obs) => {
			if (!settings.hideWatchedVideos) {
				obs.disconnect();
				return;
			}
			const progressBar = video.querySelector(QUERIES.PROGRESS_VIDEO);
			if (progressBar) {
				obs.disconnect();
				if (_videoWatched(video)) {
					video.remove();
				}
			}
		});
		observer.observe(video, { childList: true, subtree: true });
	}

	function _unitsToSeconds(quantity: number, unit: string) {
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
