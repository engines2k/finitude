import FeedFilter from "$lib/feedfilter"
const isDev = import.meta.env.DEV;
const filter = new FeedFilter(window);

export default defineContentScript({
	matches: ['https://www.youtube.com/*', 'https://m.youtube.com/*'],
	main() {
		isDev && console.log('[finitude] starting');
		filter.loadSettings();
		const pathObserver = new MutationObserver(filter.observe);
		pathObserver.observe(document.body, { childList: true, subtree: true });
	},
});

browser.runtime.onMessage.addListener(
	function listenForMessage(message, _, __) {
		if (message.type === 'filterSettingsChanged') {
			filter.loadSettings();
		}
	}
);
