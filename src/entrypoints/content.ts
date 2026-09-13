import feedFilter from "$lib/feedfilter"
const isDev = import.meta.env.DEV;

export default defineContentScript({
	matches: ['https://www.youtube.com/*', 'https://m.youtube.com/*'],
	main() {
		isDev && console.log('[finitude] starting');
		feedFilter.loadSettings();
		feedFilter.init(window);
	},
});

