import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

const app = mount(App, {
	target: document.getElementById('app')!,
});

const unitInput = document.getElementById('unit') as HTMLSelectElement;
const quantityInput = document.getElementById('quantity') as HTMLInputElement;

if (!unitInput || !quantityInput) {
  console.error('[Popup] Elements not found:', { unitInput, quantityInput });
} else {
  loadCurrentSettings();
  unitInput.onchange = changeFilterSettings;
  quantityInput.onchange = changeFilterSettings;
  console.log('[Popup] Event listeners attached');
}

async function loadCurrentSettings() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'getFilterSettings' }) as { quantity: string, unit: string } | undefined;
    if (response) {
      quantityInput.value = response.quantity;
      unitInput.value = response.unit;
      console.log('[Popup] Loaded settings:', response.quantity, response.unit);
    }
  } catch (err) {
    console.error('[Popup] Error loading settings:', err);
  }
}

async function changeFilterSettings() {
  console.log('[Popup] Sending settings:', unitInput.value, quantityInput.value);
  await browser.runtime.sendMessage({
    type: 'saveFilterSettings',
    unit: unitInput.value,
    quantity: quantityInput.value
  }).then(() => {
    console.log('[Popup] Settings sent successfully');
  }).catch(err => {
    console.error('[Popup] Error sending settings:', err);
  });
}
