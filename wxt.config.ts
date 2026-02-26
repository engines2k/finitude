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
		permissions: ['webRequest', 'webRequestBlocking', 'storage', 'webNavigation'],
		host_permissions: ['https://www.youtube.com/*'],
		browser_specific_settings: {
			gecko: {
				data_collection_permissions: {
					required: ["none"]
				}
			}
		}
	},
});
