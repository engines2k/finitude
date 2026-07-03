export default defineBackground(() => {

	browser.runtime.onMessage.addListener((message, _, __) => {
		console.log('[Background] Received message:', message);
		if (message.type === 'saveFilterSettings') {
			console.log('[Background] Saving settings:', message.quantity, message.unit);
			browser.storage.local.set({
				power: message.power,
				filterQuantity: message.quantity,
				filterUnit: message.unit,
				hideMostRelevantSection: message.hideMostRelevantSection,
				hideShortsSection: message.hideShortsSection,
				hideWatchedVideos: message.hideWatchedVideos,
				hideVideoPercentage: message.hideVideoPercentage

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
				power: true,
				filterQuantity: '24',
				filterUnit: 'hours',
				hideMostRelevantSection: true,
				hideShortsSection: true,
				hideWatchedVideos: false,
				hideVideoPercentage: .75,
			}).then((result) => {
				console.log('[Background] Returning settings:', result);
				sendResponse({
					power: result.power as boolean,
					quantity: result.filterQuantity as string,
					unit: result.filterUnit as string,
					hideMostRelevantSection: result.hideMostRelevantSection as boolean,
					hideShortsSection: result.hideShortsSection as boolean,
					hideWatchedVideos: result.hideWatchedVideos as boolean,
					hideVideoPercentage: result.hideVideoPercentage as number,
				});
			}).catch(err => {
				console.error('[Background] Error getting settings:', err);
			});
			return true;
		}
	});
});
