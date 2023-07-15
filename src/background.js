chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url.includes('chat.openai.com')) {
        chrome.tabs.sendMessage(tabId, { message: 'TabUpdated' });
    }
});