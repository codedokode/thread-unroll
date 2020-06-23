function parsePosts() {
	let posts = document.querySelectorAll('.thread__post, .thread__oppost');
	return [].map.call(posts, parsePost);
}

function parsePost(node) {
	let content = node.querySelector('.post__message');
	let time = node.querySelector('.post__time').textContent;
	let body = content.innerHTML;
	let imageNodes = node.querySelectorAll('.post__image img');
	let images = [].map.call(imageNodes, parseImage);
	let postNumber = node.querySelector('.post__number').textContent;
	let id = node.querySelector('.post[data-num]').getAttribute('data-num');

	return {
		id,
		content,
		time,
		images,
		postNumber
	};
}

function parseImage(imageNode) {
	let previewUrl = transformUrl(imageNode.getAttribute('src'));
	let previewWidth = imageNode.getAttribute('width');
	let previewHeight = imageNode.getAttribute('height');
	let url = transformUrl(imageNode.getAttribute('data-src'));
	let width = imageNode.getAttribute('data-width');
	let height = imageNode.getAttribute('data-height');

	return {
		url,
		width,
		height,
		previewUrl,
		previewWidth,
		previewHeight
	};
}

function transformUrl(relUrl) {
	return 'https://2ch.hk/' + relUrl;
}

function splitPostsToMessages(posts) {
	let messages = [];
	posts.forEach((post) => {
		let parts = splitPost(post);
		messages = messages.concat(parts);
	});

	return messages;
}

function toArray(list) {
	return [].slice.call(list);
}

function splitPost(post) {
	parts = [];

	let base = document.createElement('div');
	let node = post.content.firstChild;
	let lastReflink = null;

	while (node) {
		if (isReflink(node) && isReflinkOnNewLine(node)) {			
			if (!isEmpty(base)) {
				parts.push(createMessage(base, post, lastReflink));
			}

			base = document.createElement('div');
			lastReflink = node;
		}
		
		base.appendChild(node.cloneNode(true));
		node = node.nextSibling
	}

	if (!isEmpty(base)) {
		parts.push(createMessage(base, post, lastReflink))
	}

	return parts;
}

function createMessage(content, post, reflink) {
	let replyTo = reflink ? parseRefText(reflink.textContent) : null;
	let refNodes = content.querySelectorAll('.post-reply-link');
	let refs = [].map.call(refNodes, (n) => { parseRefText(n.textContent) });
	refs = removeFromArray(refs, replyTo);

	return {
		post,
		content,
		replyTo,
		refs,
	};
}

function parseRefText(text) {
	text = text.replace(/→$/, '');
	text = text.replace(/^\s+|\s+$/g, '');
	text = text.replace(/^>>/, '');
	return text;
}

function removeFromArray(list, value) {
	return list.filter((x) => value != x);
}

function isReflink(node) {
	return node.nodeType == Node.ELEMENT_NODE && node.classList.contains('post-reply-link');
}

/**
 * true, если ссылка reflink (>>1234) находится не в тексте, а на отдельной строке.
 */
function isReflinkOnNewLine(reflink) {
	return hasBrBeforeAfter(reflink, true) && hasBrBeforeAfter(reflink, false);
}

function hasBrBeforeAfter(reflink, isBefore) {
	let p = isBefore ? reflink.previousSibling : reflink.nextSibling;
	if (!p) {
		return true;
	}

	if (p.nodeType == Node.ELEMENT_NODE && p.tagName.toLowerCase() == 'br')  {
		return true;
	}

	if (p.nodeType == Node.TEXT_NODE && /^\s*$/.test(p.textContent)) {
		return hasBrBeforeAfter(p, isBefore);
	}

	return false;
}

function isEmpty(node) {
	return /^\s*$/.test(node.textContent);
}

function groupMessagesToThreads(messages) {
	let refMap = buildRefmap(messages);
	let queue = messages.slice();
	let threads = [];

	while (queue.length > 0) {
		let msg = queue[0];
		let thread = [];
		groupReplies(msg, queue, refMap, thread);
		threads.push(thread);
	}

	return threads;
}

function groupReplies(msg, queue, refMap, thread) {	
	thread.push(msg);
	removeFromQueue(msg, queue);
	let id = msg.post.id;

	if (id in refMap) {
		refMap[id].forEach((reply) => {
			groupReplies(reply, queue, refMap, thread);
		});
	}
}

function buildRefmap(messages) {
	let map = {};
	messages.forEach((m) => {
		if (m.replyTo) {
			let list = map[m.replyTo] || [];
			list.push(m);
			map[m.replyTo] = list;
		}
	});

	return map;
}

function removeFromQueue(msg, queue) {
	for (var i = 0; i < queue.length; i++) {
		if (queue[i] == msg) {
			queue.splice(i, 1);
		}
	}
}

let RECURSIVE_TEMPLATE = `
<div class="dialog-root">
	<% threads.forEach((thread) => { %>
		<div class="dialog-thread">
			<% let isFirst = true; %>
			<% thread.forEach((msg) => { %>
				<% let post = msg.post; %>
				<div class="dialog-msg <%= isFirst ? 'dialog-msg__first' : '' %>">
					<div class="dialog-time">
						#<%= post.id %> <%= post.time %>
					</div>
					<div class="dialog-text"><%- post.content.innerHTML %></div>
				</div>

				<% if (post.images.length) { %>
					<div class="dialog-images">
						<% post.images.forEach((img) => { %>
							<img src="<%= img.previewUrl %>" 
								width="<%= img.previewWidth %>"
								height="<%= img.previewHeight %>"
							>
						<% }) %>
					</div>
				<% } %>

				<% isFirst = false; %>
			<% }) %>
		</div>
	<% }) %>
</div>
`;

function renderRecursiveThreads(threads) {
	let base = document.querySelector('#posts-form');
	let newBase = document.createElement('div');
	base.parentNode.insertBefore(newBase, base);
	let html = ejs.render(RECURSIVE_TEMPLATE, {
		threads
	});

	newBase.innerHTML = html;
	base.style.display = 'none';
}

function mainForRecursiveThreads() {
	let posts = parsePosts();
	let msgs = splitPostsToMessages(posts);
	let threads = groupMessagesToThreads(msgs);
	renderRecursiveThreads(threads);
}

