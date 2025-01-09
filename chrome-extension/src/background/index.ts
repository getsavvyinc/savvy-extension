import 'webextension-polyfill';
import { exampleThemeStorage, tokenStorage } from '@extension/storage';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_USER_KEY') {
    console.log(message.payload, 'message.payload', message.type, 'message.type');
    void tokenStorage.set(message.payload);
    console.log('Savvy user key saved to extension storage');
  }
});

async function getUserSavvyToken(): Promise<string | null> {
  try {
    const userKey = await tokenStorage.get();
    return userKey || null;
  } catch (error) {
    console.error('Error getting Savvy token:', error);
    return null;
  }
}

// Make side panel persist across all sites
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Optional: Set the side panel to be available on all URLs
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete') {
    chrome.sidePanel.setOptions({
      tabId,
      path: 'side-panel/index.html',
      enabled: true,
    });
  }
});

// Example usage:
// const token = await getUserSavvyToken();
