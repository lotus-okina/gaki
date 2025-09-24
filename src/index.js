// biome-ignore lint/suspicious/noRedundantUseStrict: browser script
"use strict";

/** @import {PostRequest, ChannelsResponse} from "../types.d.ts" */

const CHANNEL_PROVIDER = "/channels";
const POST_COLLECTOR = "/post";

// フールプルーフのトークン
const CHANNELS_ACCESS_TOKEN = "kore-is-the-most-anzen-tookun-nari-ne";
const POST_ACCESS_TOKEN = "this-wa-mottomo-secure-token-aru-yo";

let channelSelector;
let postButton;
let messageBox;
let passwordBox;
let resultArticle;

function loadChannels() {
	const req = new Request(CHANNEL_PROVIDER, {
		headers: { Authorization: CHANNELS_ACCESS_TOKEN },
	});
	processResponse(fetch(req));
}

function setChanFetchFailed() {
	const placeholder = document.getElementById("chan-placeholder");
	placeholder.ariaBusy = false;
	placeholder.classList.value = "pico-background-red-500";
	placeholder.innerText = "取得に失敗しました";
}

/** @param {Promise<Response>} promise */
async function processResponse(promise) {
	let response;
	try {
		response = await promise;
	} catch (err) {
		console.error("network error:", err);
		setChanFetchFailed();
		return;
	}

	if (!response.ok) {
		console.error("fetch error:", response.statusText);
		console.error("body:", await response.text());
		setChanFetchFailed();
		return;
	}

	/** @type {ChannelsResponse} */
	let data;
	try {
		data = await response.json();
	} catch (err) {
		console.error("parse error:", err);
		console.error("body:", data);
		setChanFetchFailed();
		return;
	}

	channelSelector = document.createElement("select");
	console.log(data);
	for (const category of data.categories) {
		if (category.name == null) {
			// カテゴリに属さないチャンネル
			for (const chan of category.channels) {
				const option = document.createElement("option");
				option.value = chan.id;
				option.innerText = chan.name;
				channelSelector.appendChild(option);
			}
		} else {
			const categoryOptGroup = document.createElement("optgroup");
			categoryOptGroup.label = category.name;
			for (const chan of category.channels) {
				const option = document.createElement("option");
				option.value = chan.id;
				option.innerText = chan.name;
				categoryOptGroup.appendChild(option);
			}
			channelSelector.appendChild(categoryOptGroup);
		}
	}
	document.getElementById("chan-placeholder").remove();
	document.getElementById("chan-label").appendChild(channelSelector);
	checkMessageBox();
}

function doPost() {
	postButton.disabled = true;
	postButton.ariaBusy = true;
	resultArticle.innerText = "";
	resultArticle.style.visibility = "hidden";

	const message = preprocessMessage(messageBox.value);
	/** @type {PostRequest} */
	const body = {
		channelId: channelSelector.value,
		message: message,
		password: passwordBox.value,
	};

	const req = new Request(POST_COLLECTOR, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: POST_ACCESS_TOKEN,
		},
		body: JSON.stringify(body),
	});
	processPostResult(fetch(req));
}

function preprocessMessage(message) {
	// Discordの埋め込み対策サイトに置換する
	return message
		.replaceAll("https://twitter.com/", "https://fxtwitter.com/")
		.replaceAll("https://x.com/", "https://fixupx.com/")
		.replaceAll("https://www.pixiv.net/", "https://www.phixiv.net/");
}

function setResult(success, message = null) {
	if (success === true) {
		resultArticle.innerText = "投稿されました";
		resultArticle.classList.value = "pico-background-azure-500";
	} else {
		resultArticle.classList.value = "pico-background-red-500";
		if (message != null) {
			resultArticle.innerText = message;
		} else {
			resultArticle.innerText = "投稿に失敗しました";
		}
	}
	resultArticle.style.visibility = "visible";
	postButton.disabled = false;
	postButton.ariaBusy = false;
}

/** @param {Promise<Response>} promise */
async function processPostResult(promise) {
	let response;
	try {
		response = await promise;
	} catch (err) {
		console.error("network error:", err);
		setResult(false);
		return;
	}

	if (!response.ok) {
		console.error("fetch error:", response.statusText);
		const body = await response.text();
		console.error("body:", body);
		try {
			const data = JSON.parse(body);
			setResult(false, data.message);
		} catch {
			setResult(false);
		}
		return;
	}

	let data;
	try {
		data = await response.json();
	} catch (err) {
		console.error("parse error:", err);
		console.error("body:", data);
		setResult(false);
		return;
	}

	if (data?.success === true) {
		setResult(true);
		messageBox.value = "";
		checkMessageBox();
	} else {
		let message;
		if (data?.message) {
			message = data.message;
			console.error("process error:", data);
		} else {
			message = null;
			console.error("fetch error:", data);
		}
		setResult(false, message);
	}
}

function checkMessageBox() {
	postButton.disabled = messageBox.value.length === 0;
}

window.onload = async () => {
	postButton = document.getElementById("post");
	messageBox = document.getElementById("message");
	passwordBox = document.getElementById("password");
	resultArticle = document.getElementById("result");
	postButton.onclick = doPost;
	messageBox.addEventListener("input", checkMessageBox);
	loadChannels();
};
