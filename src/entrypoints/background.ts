export default defineBackground(() => {
	const tabUrls = new Map<number, string>();
	const tabAllowances = new Map<number, boolean>();

	function resetAllowance(details: any) {
		tabAllowances.set(details.tabId, true);
		tabUrls.set(details.tabId, details.url);
	}

	function trackTabUrl(tabId, _, tab) {
		if (tab.url) {
			tabUrls.set(tabId, tab.url);
		}
	}

	function blockSubscriptionContinuations(details) {
		const pageUrl = tabUrls.get(details.tabId) || '';
		if (!pageUrl.includes('/feed/subscriptions')) {
			return { cancel: false };
		}

		const allowed = tabAllowances.get(details.tabId);
		if (allowed === undefined || allowed === true) {
			tabAllowances.set(details.tabId, false);
			console.log('for now...');
			return { cancel: false };
		}

		return { cancel: true };
	}

	browser.tabs.onUpdated.addListener(trackTabUrl);

	browser.webNavigation.onHistoryStateUpdated.addListener(resetAllowance)
	browser.webNavigation.onBeforeNavigate.addListener(resetAllowance)

	browser.webRequest.onBeforeRequest.addListener(
		blockSubscriptionContinuations,
		{ urls: ['*://www.youtube.com/youtubei/v1/browse*'] },
		['blocking']
	);


	browser.tabs.onRemoved.addListener((tabId) => {
		tabUrls.delete(tabId);
	});

	browser.runtime.onMessage.addListener((message, _, sendResponse) => {
		console.log('[Background] Received message:', message);
		if (message.type === 'saveFilterSettings') {
			console.log('[Background] Saving settings:', message.quantity, message.unit);
			browser.storage.local.set({
				filterQuantity: message.quantity,
				filterUnit: message.unit
			}).then(() => {
				console.log('[Background] Settings saved, querying tabs...');
				browser.tabs.query({ url: 'https://www.youtube.com/*' }).then((tabs) => {
					console.log('[Background] Found tabs:', tabs.length);
					for (const tab of tabs) {
						browser.tabs.sendMessage(tab.id!, { type: 'filterSettingsChanged' });
					}
				});
			}).catch(err => {
				console.error('[Background] Error saving settings:', err);
			});
		}
	});

	browser.runtime.onMessage.addListener((message, _, sendResponse) => {
		console.log('[Background] getFilterSettings request:', message);
		if (message.type === 'getFilterSettings') {
			browser.storage.local.get({
				filterQuantity: '24',
				filterUnit: 'hours'
			}).then((result) => {
				console.log('[Background] Returning settings:', result);
				sendResponse({
					quantity: result.filterQuantity as string,
					unit: result.filterUnit as string
				});
			}).catch(err => {
				console.error('[Background] Error getting settings:', err);
			});
			return true;
		}
	});
});
