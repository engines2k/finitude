import { defineConfig } from 'wxt';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	webExt: {
		firefoxProfile: '.wxt/firefox-profile',
		keepProfileChanges: true,
		startUrls: ['https://youtube.com']
	},
	manifest: {
		permissions: ['webRequest', 'webRequestBlocking', 'storage'],
		host_permissions: ['https://www.youtube.com/*'],
	},
});
