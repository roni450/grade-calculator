chrome.runtime.onInstalled.addListener(() => {
  console.log("Zen Roulette extension installed.");
});

// Example of handling messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startGame") {
    console.log("Starting game...");
    sendResponse({ status: "Game started" });
  }
});
