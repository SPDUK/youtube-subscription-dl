const { google } = require('googleapis');
const shell = require('shelljs');
const fs = require('fs');

const service = google.youtube('v3');

const historyPath = `${__dirname}/history.json`;
// updates previous history if passed in, otherwise it's empty
function updateHistory(last, retry = {}) {
  fs.writeFileSync(
    historyPath,
    JSON.stringify({
      last,
      retry
    })
  );
}

if (!fs.existsSync(historyPath)) {
  const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime();
  updateHistory(yesterday);
}
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// download a single video, if we can't download it then add it to the retry table
// hopefully skips currently live livestreams
function download(id) {
  const dl = shell.exec(`youtube-dl https://youtu.be/${id} --match-filter '!is_live'`);
  if (dl.code) {
    // if the current id isn't already in history.retry, add it
    if (!history.retry[id]) history.retry[id] = { count: 1 };
    else {
      history.retry[id].count = history.retry[id].count + 1 || 1;
    }
  }
}

// checks if a video is new, if it is we download it
function getNewVideos(video) {
  const videoDate = new Date(video.snippet.publishedAt).getTime();
  const id = video.snippet.resourceId.videoId;

  // if the item is newer than the last time we fetched videos and it has not been seen before
  if (videoDate > history.last) download(id);
}

// object of retries that need to be done
function retryDownload(retries) {
  const ids = Object.keys(retries);
  ids.forEach(id => {
    // if we retried 4 times before, remove the id from the retry table
    if (history.retry[id].count > 4) {
      delete history.retry[id];
    } else {
      download(id);
    }
  });
  // update history with new retries if we had to update them
  updateHistory(Date.now(), history.retry);
}

async function getSubscriptions(auth, pageToken = '', allSubscriptions = []) {
  // get data from the subscriptions
  const { data } = await service.subscriptions.list({
    mine: true,
    auth,
    part: 'snippet',
    maxResults: 50, // max is 50
    order: 'alphabetical', // use alphabetical to always have the same order
    pageToken
  });
  // push all the current subscriptions to the array of all subscriptions
  allSubscriptions.push(...data.items);
  // if there is another page of subscriptions to be looked at - repeat again
  if (data.nextPageToken) {
    await getSubscriptions(auth, data.nextPageToken, allSubscriptions);
  }
  return allSubscriptions;
}

async function fetchVideos(auth) {
  const channels = await getSubscriptions(auth);

  for (const channel of channels) {
    const id = channel.snippet.resourceId.channelId;
    // get list of all channel uploads
    const channelInfo = await service.channels.list({
      id,
      auth,
      part: 'contentDetails'
    });
    // destructure the uploads playlist (all channel videos)
    const {
      contentDetails: {
        relatedPlaylists: { uploads }
      }
    } = channelInfo.data.items[0];

    const {
      data: { items }
    } = await service.playlistItems.list({
      playlistId: uploads,
      auth,
      part: 'snippet',
      maxResults: 20 // 20? not many people upload more than 20 videos per day?
    });
    items.forEach(getNewVideos);
  }
  // if there is current videos that have failed download - retry them this time
  if (Object.keys(history.retry).length) {
    retryDownload(history.retry);
  } else {
    updateHistory(Date.now());
  }
}

module.exports = { fetchVideos, getNewVideos };
