export default defineBackground(() => {
  console.log('[Background] Script loaded');

  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.requestBody && details.requestBody.raw) {
        const body = details.requestBody.raw[0].bytes;
        if (body) {
          const decoder = new TextDecoder();
          const bodyStr = decoder.decode(body);
          if (bodyStr.includes('"continuation"')) {
            return { cancel: true };
          }
        }
      }
      return { cancel: false };
    },
    {
      urls: ['https://www.youtube.com/youtubei/v1/browse'],
    },
    ['blocking', 'requestBody']
  );

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
