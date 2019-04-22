const { google } = require('googleapis');
const shell = require('shelljs');
const fs = require('fs');
const logAndNotify = require('./helpers/logAndNotify');
const pluralize = require('./helpers/pluralize');

const service = google.youtube('v3');
// state for how many videos we downloaded this time
const newDownloadedVideos = {
  names: [],
  count: 0
};

const historyPath = `${__dirname}/history.json`;
// updates previous history if passed in, otherwise it's empty
// gets created if it doesn't exist, and updated whenever we finish fetching videos
function updateHistory(last, retry = {}) {
  try {
    fs.writeFileSync(
      historyPath,
      JSON.stringify({
        last,
        retry
      })
    );
  } catch (err) {
    logAndNotify({
      title: `Could not create or edit file at ${historyPath}`,
      message: err
    });
  }
}

// if the end of the stdout shows a message saying the video was already downloaded/seen, return true
function checkIfVideoDownloaded(stdout) {
  return (
    stdout.substr(-38).includes('already been recorded in archive') ||
    stdout.substr(-38).includes('already been downloaded and merged')
  );
}

if (!fs.existsSync(historyPath)) {
  const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime();
  updateHistory(yesterday);
}
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// download a single video, if we can't download it then add it to the retry table
// hopefully skips currently live livestreams
function download(id, channelTitle = '') {
  // loop that will re-connect the download even if the internet connection disconnects mid-download, continuing where it left off, even if the IP changes or wifi changes etc
  const { stdout, code } = shell.exec(
    `while ! youtube-dl https://youtu.be/${id} -c --match-filter '!is_live' --socket-timeout 10; do sleep 10; done`
  );
  // if download has an error code
  if (code) {
    // if the current id isn't already in history.retry, add it
    if (!history.retry[id]) history.retry[id] = { count: 1 };
    else {
      history.retry[id].count = history.retry[id].count + 1 || 1;
    }
  }
  // if the video has already been downloaded or is in the archive, don't add it to the notification info
  if (checkIfVideoDownloaded(stdout)) return;

  newDownloadedVideos.count = newDownloadedVideos.count + 1 || 1;
  // add the channel's title to the list of names so we can show who we have new videos from in notifications
  // skip if it's a retry (since we only store the ID, not the full info)
  if (channelTitle) newDownloadedVideos.names.push(channelTitle);
}

// checks if a video is new, if it is we download it
function getNewVideos(video) {
  // destructure publish time, channel title and the video id
  const {
    snippet: {
      publishedAt,
      channelTitle,
      resourceId: { videoId }
    }
  } = video;
  const videoDate = new Date(publishedAt).getTime();

  // if the item is newer than the last time we fetched videos and it has not been seen before
  if (videoDate > history.last) download(videoId, channelTitle);
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
  // get the first 3 names from the list of channel names and join them on comma with a space eg: "John, Billy, David"
  const channelNames = newDownloadedVideos.names.slice(0, 3).join(', ');
  // if we have more than 3 extra names, make a pretty message like "And 4 more.."
  const { count } = newDownloadedVideos;
  const additionalNames = count - 3 > 0 ? `and ${count - 3} others..` : '';
  // if we have new videos downloaded, show the message, otherwise just show the title
  const message = count
    ? `${count} New ${pluralize(count, 'video')} from ${channelNames} ${additionalNames}`
    : 'No new videos';

  logAndNotify({
    title: `Finished fetching youtube subscriptions`,
    message
  });
}

module.exports = fetchVideos;
