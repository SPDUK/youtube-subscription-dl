const { google } = require('googleapis');
const shell = require('shelljs');
const fs = require('fs');

const historyPath = './history.json';
// updates previous history if passed in, otherwise it's empty
function updateHistory(retry = {}) {
  fs.writeFileSync(
    historyPath,
    JSON.stringify({
      last: Date.now(),
      retry
    })
  );
}

if (!fs.existsSync(historyPath)) {
  updateHistory();
}
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// download a single video, if we can't download it then add it to the retry table
function download(id) {
  const dl = shell.exec(`youtube-dl youtu.be/${id}`);
  if (dl.code) {
    history.retry[id].count = history.retry[id].count + 1 || 1;
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
  updateHistory(history.retry);
}

async function fetchVideos(auth) {
  const service = google.youtube('v3');
  // get a list of all current subscriptions
  const subscriptions = await service.subscriptions.list({
    mine: true,
    auth,
    part: 'snippet'
  });
  // array of each channel you're subscribed to
  const channels = subscriptions.data.items;

  for (const channel of channels) {
    const id = channel.snippet.resourceId.channelId;
    // get list of all channel uploads
    const channelInfo = await service.channels.list({
      id,
      auth,
      part: 'contentDetails'
    });
    // destructure the uploads playlist (all channel videos) and the channel title
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
    updateHistory();
  }
}

module.exports = { fetchVideos, getNewVideos };
