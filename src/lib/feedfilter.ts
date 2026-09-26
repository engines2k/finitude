import { VideoLookupError } from "../lib/errors"

let lastPath = '';
const isDev = import.meta.env.DEV;
const subsQuery = `ytd-browse[page-subtype="subscriptions"][role="main"] #primary ytd-rich-grid-renderer, ytm-browse .tab-content[tab-identifier="FEsubscriptions"] ytm-rich-grid-renderer`
let observer: MutationObserver | null = null;
const FinitudeLogoUrl = (browser.runtime.getURL as (path: string) => string)('message-logo.webp');

export default class FeedFilterer {
	private QUERIES = {
		VIDEO_SUBSCRIPTION: "ytd-item-section-renderer",
		VIDEO_SUBSCRIPTION_GRID: "ytd-rich-item-renderer",
		VIDEO_SUBSCRIPTION_MOBILE: "ytm-rich-item-renderer",
		PROGRESS_VIDEO: ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, .ytwThumbnailOverlayResumePlaybackRendererThumbnailOverlayResumePlaybackProgress, .YtmThumbnailOverlayResumePlaybackRendererThumbnailOverlayResumePlaybackProgress",
		CONTINUATOR_FEED: `ytd-continuation-item-renderer, ytm-continuation-item-renderer`,
		SECTION_TITLE: "#rich-shelf-header #title, .rich-shelf-header .rich-shelf-title span, .reel-shelf-title span",
	} as const;

	private debounceTimer = 20;

	settings = {
		power: true,
		ageLimitSeconds: 86399,
		hideMostRelevantSection: true,
		hideShortsSection: true,
		hideWatchedVideos: false,
		hideVideoPercentage: .75,
	};

	videoTypes = {
		subscription: this.QUERIES.VIDEO_SUBSCRIPTION,
		grid: this.QUERIES.VIDEO_SUBSCRIPTION_GRID,
		mobile: this.QUERIES.VIDEO_SUBSCRIPTION_MOBILE,
	};

	constructor(window: Window) {
		window.addEventListener('yt-navigate-finish', this.handleNavigation);
	}

	observe = () => {
		let currentPath = window.location.href;
		if (currentPath !== lastPath) {
			lastPath = currentPath;
			this.handleNavigation();
		}
	}

	handleNavigation = () => {
		isDev && console.log('[finitude] caught page navigation');
		this.tryObserve();
		const tryFilter = () => {
			const subsPageEl = document.querySelector(subsQuery);
			isDev && console.log("[finitude] re-grabbing subs element...");
			isDev && console.log({ subsPageEl });
			if (subsPageEl) {
				this.debounceTimer = 20;
				this.filterVideos(subsPageEl);
			} else {
				this.debounceTimer *= 2;
				setTimeout(tryFilter, this.debounceTimer);
			}
		};
		tryFilter();
	}

	tryObserve = () => {
		isDev && console.log("observing");
		observer && observer.disconnect();
		if (!this.shouldRun()) return;
		let subsPage = document.querySelector(subsQuery);
		if (subsPage) {
			isDev && console.log({ subsPage });
			observer = new MutationObserver(this.handleFeedMutation);
			observer.observe(subsPage, { childList: true, subtree: true });
		} else {
			isDev && console.log("[finitude] Couldn't find subs page element, trying again later");
			setTimeout(() => requestAnimationFrame(this.tryObserve), 250);
		}
	};

	handleFeedMutation = (records: MutationRecord[]) => {
		this.loadSettings();
		for (const record of records) {
			if (record.type != "childList") continue;
			if (!this.shouldRun()) {
				this.resumeFeedContinuation();
				continue;
			}
			this.filterVideos(record.addedNodes);
		}
	}

	shouldRun(): boolean {
		let path = window.location.pathname;
		return path.includes('/feed/subscriptions') && this.settings.power;
	}

	filterVideos(_target: NodeList | Element) {
		this._handleFeedMutation();
	}

	async loadSettings() {
		try {
			const response = await browser.runtime.sendMessage({ type: 'getFilterSettings' }) as { power: boolean, quantity: string, unit: string, hideMostRelevantSection: boolean, hideShortsSection: boolean, hideWatchedVideos: boolean, hideVideoPercentage: number } | undefined;
			if (response) {
				this.settings.power = response.power;
				this.settings.ageLimitSeconds = unitsToSeconds(parseInt(response.quantity), response.unit);
				this.settings.hideMostRelevantSection = response.hideMostRelevantSection;
				this.settings.hideShortsSection = response.hideShortsSection;
				this.settings.hideWatchedVideos = response.hideWatchedVideos;
				this.settings.hideVideoPercentage = response.hideVideoPercentage;
			}
		} catch (err) {
			isDev && console.error('[finitude] Error loading settings:', err);
		}
	}

	stopFeedContinuation = () => {
		isDev && console.log("stopping continuation...");
		const subsFeed = document.querySelector(subsQuery);
		const continuator = subsFeed?.querySelector(this.QUERIES.CONTINUATOR_FEED) as HTMLElement;
		isDev && console.log({ continuator });
		if (continuator)
			continuator.style.display = 'none';
		else {
			console.error(`[finitude]: Unable to locate continuation element`);
			isDev && console.log({ subsFeed, continuator })
		}
		this.addFeedEndMessage();
	}

	addFeedEndMessage = () => {
		const existing = document.getElementById('finitude-end-message');
		if (existing) return;

		const container = document.createElement('div');
		container.id = 'finitude-end-message';
		container.style.cssText = 'display: flex; flex-direction: column; align-items: center; padding: 20px;';
		container.innerHTML = `
			<img src="${FinitudeLogoUrl}" width="50" height="50" alt="Finitude">
			<p style="margin-top: 8px; color: #888; font-family: inherit; font-size: 1.5rem;">You're caught up</p>
		`;
		document.querySelector(subsQuery)?.appendChild(container);
	}

	resumeFeedContinuation() {
		const subsFeed = document.querySelector(subsQuery);
		const continuator = subsFeed?.querySelector(this.QUERIES.CONTINUATOR_FEED) as HTMLElement;
		if (continuator)
			continuator.style.display = 'block';
		else {
			console.error(`[finitude]: Unable to locate continuation element`);
			isDev && console.log({ subsFeed, continuator })
		}
	}

	_handleFeedMutation() {
		if (!this.shouldRun())
			return;
		const subsFeed = document.querySelector(subsQuery);
		if (!subsFeed) return;
		const allVideos = subsFeed.querySelectorAll(Object.values(this.videoTypes).join(', '));
		isDev && console.log(`Evaluating ${allVideos.length} total videos`);
		isDev && console.log({ allVideos });
		let oldHidden = false;
		for (let [type, query] of Object.entries(this.videoTypes) as [keyof typeof this.videoTypes, string][]) {
			let videos = Array.from(allVideos).filter(el => el instanceof Element && el.matches(query));
			isDev && console.log(`${type}: ${videos.length} videos`);
			for (let video of videos as Element[]) {
				if (this._videoTooOld(video as HTMLElement, type)) {
					video.remove();
					oldHidden = true;
				}
				if (this.settings.hideWatchedVideos) {
					if (this._videoWatched(video as HTMLElement)) {
						video.remove();
					} else if (!video.querySelector(this.QUERIES.PROGRESS_VIDEO)) {
						this._observeVideoProgress(video as HTMLElement);
					}
				}
			}
		}
		if (oldHidden) this.stopFeedContinuation();
		if (this.settings.hideMostRelevantSection)
			this._hideSection("Most relevant");
		if (this.settings.hideShortsSection)
			this._hideSection("Shorts");
	}

	_hideSection(name: string) {
		const sectionsQuery = "ytd-rich-section-renderer, ytm-rich-section-renderer"
		// isDev && console.log(`[finitude] hiding section ${name}`);
		let sections = document.querySelectorAll(sectionsQuery)
		for (let section of sections) {
			const titleElement = section.querySelector(this.QUERIES.SECTION_TITLE);
			if (titleElement?.textContent == name)
				section.remove();
		}
	}

	_videoTooOld(video: HTMLElement, viewType: keyof typeof this.videoTypes) {
		try {
			const age = this._getVideoAge(video, viewType);
			isDev && console.log(`${video.querySelector('.ytLockupMetadataViewModelTitle span')?.textContent} has age of ${age} seconds`);
			return age >= this.settings.ageLimitSeconds;
		} catch (e) {
			isDev && console.log("Video age lookup for failed:", e.message, video);
		}
	}

	_getVideoAge(video: HTMLElement, viewType: keyof typeof this.videoTypes) {
		let metadataHtml: string | null = null;

		switch (viewType) {
			case 'mobile': {
				const metadata = video.querySelectorAll("ytm-badge-and-byline-renderer .ytAttributedStringHost");
				metadataHtml = (metadata?.[2] as HTMLElement)?.textContent;
				break;
			}

			case 'subscription': {
				const metadata = video.querySelectorAll("#metadata-line .ytd-video-meta-block");
				metadataHtml = (metadata?.[3] as HTMLElement)?.textContent;
				break;
			}
			case 'grid': {
				const metadataContainer = video.querySelector("yt-content-metadata-view-model");
				if (metadataContainer) {
					for (const el of Array.from(metadataContainer.querySelectorAll("*"))) {
						if (el.children.length !== 0) continue;
						const text = el.textContent?.trim();
						if (text?.match(/(\d+)\s?(second|minute|hour|day|week|month|year|s|d|h|y)s?\s+(?:ago|streaming)/i)) {
							metadataHtml = text;
							break;
						}
					}
				}
				break;
			}
		}

		if (!metadataHtml)
			throw new VideoLookupError("Could not find medatada for video element:");

		const match = metadataHtml.match(/(\d+)\s?(second|minute|hour|day|week|month|year|s|d|h|y)s?\s+(?:ago|streaming)/i);
		if (!match)
			throw new VideoLookupError("Could not find medatada for video element:");

		return unitsToSeconds(Number(match[1].replace(',', '')), match[2]);
	}

	_videoWatched(video: HTMLElement): boolean {
		const progressBar = video.querySelector(this.QUERIES.PROGRESS_VIDEO);
		isDev && console.log(`[finitude] checking progress for ${video}, progress bar: ${progressBar}`);
		if (!progressBar) return false;
		const progressWidth = (progressBar as HTMLElement).style.width;
		const progress = parseFloat(progressWidth) / 100;
		isDev && console.log({ progressWidth, video, progress })
		if (progress >= this.settings.hideVideoPercentage) {
			isDev && console.log(`Hid watched video: ${video}`);
			return true
		}
		return false;
	}

	_observeVideoProgress(video: HTMLElement) {
		const observer = new MutationObserver((mutations, obs) => {
			if (!this.settings.hideWatchedVideos) {
				obs.disconnect();
				return;
			}
			const progressBar = video.querySelector(this.QUERIES.PROGRESS_VIDEO);
			if (progressBar) {
				obs.disconnect();
				if (this._videoWatched(video)) {
					video.remove();
				}
			}
		});
		observer.observe(video, { childList: true, subtree: true });
	}


}

function unitsToSeconds(quantity: number, unit: string) {
	const multiplierUnits: Record<string, number> = {
		"s": 1,
		"second": 1,
		"seconds": 1,
		"minute": 60,
		"minutes": 60,
		"m": 60,
		"h": 3600,
		"hour": 3600,
		"hours": 3600,
		"d": 86400,
		"day": 86400,
		"days": 86400,
		"w": 604800,
		"week": 604800,
		"weeks": 604800,
		"month": 2592000,
		"months": 2592000,
		"year": 31536000,
		"years": 31536000
	};

	let multiplier = multiplierUnits[unit.toLowerCase()];
	return (multiplier ?? NaN) * quantity;
}
