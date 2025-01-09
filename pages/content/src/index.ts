import { createStorage } from '@extension/storage/lib/base/base';
import { toggleTheme } from '@src/toggleTheme';

console.log('content script loaded');

// Create storage for the user key
const userKeyStorage = createStorage<string>('savvy_user_key', '', {
  liveUpdate: true,
});

// Function to extract and send user key to background script
function extractAndSendUserKey() {
  try {
    console.log('extractAndSendUserKey');
    const savvyUserData = localStorage.getItem('savvy_user');
    console.log('savvyUserData', savvyUserData);
    if (!savvyUserData) {
      console.log('no savvy user data');
      return;
    }

    const userData = JSON.parse(savvyUserData);
    if (userData?.token) {
      console.log('sending user key to background script');
      chrome.runtime.sendMessage({
        type: 'SAVE_USER_KEY',
        payload: userData.token,
      });
    }
  } catch (error) {
    console.error('Error extracting savvy user key:', error);
  }
}

// Run initial extraction
extractAndSendUserKey();

// Listen for changes to localStorage from other tabs
window.addEventListener('storage', event => {
  if (event.key === 'savvy_user') {
    void extractAndSendUserKey();
  }
});

// Monitor localStorage changes in current tab
const originalSetItem = localStorage.setItem;
localStorage.setItem = function (key: string, value: string) {
  originalSetItem.apply(this, [key, value]);
  if (key === 'savvy_user') {
    void extractAndSendUserKey();
  }
};

// Original theme toggle
toggleTheme();

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    try {
      const savvyUserData = localStorage.getItem('savvy_user');
      if (!savvyUserData) {
        console.log('no savvy user data');
        sendResponse({ token: null });
        return true;
      }

      const userData = JSON.parse(savvyUserData);
      console.log('my userData', userData);
      sendResponse({ token: userData?.token || null });
    } catch (error) {
      console.error('Error getting auth token:', error);
      sendResponse({ token: null });
    }
    return true;
  }
  return true;
});
