chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    port.onDisconnect.addListener(async function () {
      const tab = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tabId = tab[0].id;
      if (tabId) {
        chrome.scripting.removeCSS({
          target: { tabId },
          files: ["inject.css"],
        });
      }
    });
  }
});
