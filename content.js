// Content script - runs in the context of web pages

console.log('CodeBrief Extension content script loaded');

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'doSomething') {
    // Perform some action on the page
    console.log('Received action from popup');
    
    // Example: Change page title
    // document.title = 'Modified by CodeBrief Extension';
    
    sendResponse({ success: true });
  }
});

// You can add page interaction logic here
// For example, modify DOM elements, inject styles, etc.

