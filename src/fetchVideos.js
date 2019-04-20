const { google } = require('googleapis');
const shell = require('shelljs');
const fs = require('fs');

const historyPath = './history.json';
if (!fs.existsSync(historyPath)) {
  fs.writeFileSync(
    historyPath,
    JSON.stringify({
      last: Date.now(),
      subscriptions: []
    })
  );
}
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

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
    console.log(title);
    console.log(uploads);

    const ups = await service.playlistItems.list({
      playlistId: uploads,
      auth,
      part: 'snippet,contentDetails'
    });
    const vidId = ups.data.items[0].snippet.resourceId.videoId;
    // console.log(vidId);
    // shell.exec(`youtube-dl youtu.be/${vidId}`); this works
  }
}

module.exports = fetchVideos;
