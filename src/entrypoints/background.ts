export default defineBackground(() => {
  browser.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1,
        priority: 1,
        action: { type: 'block' },
        condition: {
          regexFilter: '^https://www\\.youtube\\.com/youtubei/v1/browse.*continuation=',
        },
      },
    ],
  });
});
