"use strict"
const CHANNEL_PROVIDER = "/channels";
const POST_COLLECTOR = "/post";

const CHANNELS_ACCESS_TOKEN = "kore-is-the-most-anzen-tookun-nari-ne";
const POST_ACCESS_TOKEN = "this-wa-mottomo-secure-token-aru-yo";

let channelSelector = null
const postButton = document.getElementById("post");
const messageBox = document.getElementById("message");
const passwordBox = document.getElementById("password");
const resultParagraph = document.getElementById("result");

function loadChannels() {
  const req = new Request(
    CHANNEL_PROVIDER, {
    headers: { "Authorization": CHANNELS_ACCESS_TOKEN }
  });
  processResponse(fetch(req))
}

function setChanFetchFailed() {
  const placeholder = document.getElementById("chan-placeholder")
  placeholder.ariaBusy = false;
  placeholder.classList.value = "pico-background-red-500"
  placeholder.innerText = "取得に失敗しました"
}

/** @param {Promise<Response>} promise */
async function processResponse(promise) {
  let response
  try {
    response = await promise;
  } catch (err) {
    console.error("network error:", err)
    setChanFetchFailed()
    return
  }

  if (!response.ok) {
    console.error("fetch error:", response.statusText);
    console.error("body:", await response.text());
    setChanFetchFailed()
    return
  }

  let data
  try {
    data = await response.json()
  } catch (err) {
    console.error("parse error:", err);
    console.error("body:", data);
    setChanFetchFailed()
    return;
  }

  channelSelector = document.createElement("select");
  for (const chan of data?.channels) {
    const option = document.createElement("option");
    option.value = chan.id;
    option.innerText = chan.name;
    // TODO: スレッドを目立たせる
    channelSelector.appendChild(option);
  }
  postButton.disabled = false;
  document.getElementById("chan-placeholder").remove()
  document.getElementById("chan-label").appendChild(channelSelector);
}

function doPost() {
  postButton.disabled = true;
  postButton.ariaBusy = true;
  resultParagraph.innerText = "";
  resultParagraph.style.visibility = "hidden";
  const req = new Request(POST_COLLECTOR, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": POST_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      "channel_id": channelSelector.value,
      "message": messageBox.value,
      "password": passwordBox.value,
    })
  });
  processPostResult(fetch(req));
}

function setResult(success, message = null) {
  if (success === true) {
    resultParagraph.innerText = "投稿されました";
    resultParagraph.classList.value = "pico-background-azure-500"
  } else {
    resultParagraph.classList.value = "pico-background-red-500"
    if (message != null) {
      resultParagraph.innerText = message;
    } else {
      resultParagraph.innerText = "投稿に失敗しました";
    }
  }
  resultParagraph.style.visibility = "visible";
  postButton.disabled = false;
  postButton.ariaBusy = false;
}

/** @param {Promise<Response>} promise */
async function processPostResult(promise) {
  let response
  try {
    response = await promise;
  } catch (err) {
    console.error("network error:", err)
    setResult(false)
    return
  }

  if (!response.ok) {
    console.error("fetch error:", response.statusText);
    console.error("body:", await response.text());
    setResult(false)
    return
  }

  let data
  try {
    data = await response.json()
  } catch (err) {
    console.error("parse error:", err);
    console.error("body:", data);
    setResult(false)
    return;
  }

  if (data?.success === true) {
    setResult(true)
    messageBox.value = "";
  } else {
    let message;
    if (data?.message) {
      message = data.message;
      console.log("process error:", data)
    } else {
      message = null
      console.error("fetch error:", data);
    }
    setResult(false, message)
  }
}

window.onload = () => {
  loadChannels();
  postButton.onclick = doPost;
}