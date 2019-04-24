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
// gets created if it doesn't exist, and updated whenever we finish downloading videos
function updateHistory(last, retry = {}) {
  try {
    fs.writeFileSync(
      historyPath,
      JSON.stringify({
        last,
        retry
      })
    );
  } catch (error) {
    logAndNotify({
      title: `Could not create or edit file at ${historyPath}`,
      message: error.message
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
// skips currently live livestreams
function download(id, channelTitle = '') {
  // if the connection disconnects for 30 seconds it will cancel the download and retry next time
  const { stdout, code } = shell.exec(
    `youtube-dl https://youtu.be/${id} -c --socket-timeout 30 --match-filter '!is_live'`
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
    // if we retried 5 times total (6 including initial try), remove the id from the retry table
    if (history.retry[id].count > 5) {
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
    maxResults: 50, // max is 50, doesn't really matter as it's batched
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

function retryAndUpdate() {
  // if there is current videos that have failed download - retry them this time
  if (Object.keys(history.retry).length) {
    retryDownload(history.retry);
  } else {
    updateHistory(Date.now());
  }
}

function notifyAfterCompletion() {
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
    title: 'Finished downloading youtube subscriptions',
    message
  });
}

async function getUploads(channel, auth) {
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
    maxResults: 50 // 50 is the max
  });
  items.forEach(getNewVideos);
}

async function fetchVideos(auth) {
  // get list of all subscriptions for the authorized user
  const channels = await getSubscriptions(auth);

  try {
    // run all requests async at once, only retry and notify once all requests finish
    // errors if a single one errors, so next run will download again as history won't be updated
    await Promise.all(channels.map(channel => getUploads(channel, auth)));
    retryAndUpdate();
    notifyAfterCompletion();
  } catch (error) {
    logAndNotify({
      title: 'Error downloading youtube subscriptions',
      message: error.message
    });
  }
}

module.exports = fetchVideos;
