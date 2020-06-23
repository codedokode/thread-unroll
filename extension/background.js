browser.pageAction.onClicked.addListener(function () {
	let ejsUrl = '/content/ejs.js';
	let scriptUrl = '/content/unroll-proto.js';
	let cssUrl = '/content/unroll-proto.css';

	Promise.all([
		browser.tabs.insertCSS({ file: cssUrl }),
		browser.tabs.executeScript({ file: ejsUrl }),
		browser.tabs.executeScript({ file: scriptUrl })
	]).then(function () {
		return browser.tabs.executeScript({
			code: 'mainForRecursiveThreads()'
		})
	}).catch(function (e) {
		console.log("Error: " + e.message);
	});
});