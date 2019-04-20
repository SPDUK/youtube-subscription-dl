const { google } = require('googleapis');
const shell = require('shelljs');
const fs = require('fs');

const historyPath = './history.json';
// updates previous history if passed in, otherwise it's empty
function updateHistory(previous = []) {
  fs.writeFileSync(
    historyPath,
    JSON.stringify({
      last: Date.now(),
      previous
    })
  );
}

if (!fs.existsSync(historyPath)) {
  updateHistory();
}
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

function getNewVideos(video) {
  const videoDate = new Date(video.snippet.publishedAt).getTime();
  const vidId = video.snippet.resourceId.videoId;

  // if the item is newer than the last time we fetched videos and it has not been seen before
  if (videoDate > history.last && !history.previous[vidId]) {
    history.previous[vidId] = true;
    shell.exec(`youtube-dl youtu.be/${vidId}`);
  }
}

async function fetchVideos(auth) {
  const service = google.youtube('v3');
  // get a list of all current subscriptions
  const subscriptions = await service.subscriptions.list({
    mine: true,
    auth,
    part: 'snippet,contentDetails'
  });
  // array of each channel you're subscribed to
  const channels = subscriptions.data.items;

  for (const channel of channels) {
    const id = channel.snippet.resourceId.channelId;
    // get list of all channel uploads
    const channelInfo = await service.channels.list({
      id,
      auth,
      part: 'snippet,contentDetails'
    });
    // destructure the uploads playlist (all channel videos) and the channel title
    const {
      contentDetails: {
        relatedPlaylists: { uploads }
      },
      snippet: { title }
    } = channelInfo.data.items[0];

    const {
      data: { items }
    } = await service.playlistItems.list({
      playlistId: uploads,
      auth,
      part: 'snippet,contentDetails',
      maxResults: 20 // 20? not many people upload more than 20 videos per day?
    });
    items.forEach(getNewVideos);

    updateHistory(history.previous);
  }
}

module.exports = { fetchVideos, getNewVideos };
