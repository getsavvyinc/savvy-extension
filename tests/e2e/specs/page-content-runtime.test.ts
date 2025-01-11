describe('Webextension Content Runtime Script', () => {
  before(function () {
    if ((browser.capabilities as WebdriverIO.Capabilities).browserName === 'chrome') {
      // Chrome doesn't allow content scripts on the extension pages
      this.skip();
    }
  });

  it('should create runtime element on the page', async () => {
    // Open the popup
    const extensionPath = await browser.getExtensionPath();
    const popupUrl = `${extensionPath}/popup/index.html`;
    await browser.url(popupUrl);

    await expect(browser).toHaveTitle('Popup');

    // Trigger the content script on the popup
    // button contains "Content Script" text
  });
});
