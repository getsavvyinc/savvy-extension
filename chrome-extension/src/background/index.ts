import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import { createStorage } from '@extension/storage/lib/base/base';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

const userKeyStorage = createStorage<string>('savvy_user_key', '', {
  liveUpdate: true,
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_USER_KEY') {
    console.log(message.payload, 'message.payload', message.type, 'message.type');
    void userKeyStorage.set(message.payload);
    console.log('Savvy user key saved to extension storage');
  }
});

async function getUserSavvyToken(): Promise<string | null> {
  try {
    const userKey = await userKeyStorage.get();
    return userKey || null;
  } catch (error) {
    console.error('Error getting Savvy token:', error);
    return null;
  }
}

// Example usage:
// const token = await getUserSavvyToken();
