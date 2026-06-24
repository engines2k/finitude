import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	vite: () => ({
		plugins: [tailwindcss()],
		resolve: {
			alias: {
				$lib: resolve(__dirname, './src/lib'),
			},
		},
	}),
	webExt: {
		firefoxProfile: '.wxt/firefox-profile',
		keepProfileChanges: true,
		startUrls: ['https://youtube.com']
	},
	manifest: {
		permissions: ['storage'],
		browser_specific_settings: {
			gecko: {
				data_collection_permissions: {
					required: ["none"]
				}
			}
		}
	},
});
