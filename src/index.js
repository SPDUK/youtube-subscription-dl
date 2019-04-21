const fs = require('fs');
const shell = require('shelljs');
const path = require('path');

const readline = require('readline');
const { google } = require('googleapis');

const { OAuth2 } = google.auth;
const { fetchVideos } = require('./fetchVideos');

const ver = shell.exec('youtube-dl --version');
// if there's an error code (not 0) throw an error because youtube-dl isn't installed
if (ver.code) {
  throw new Error(
    'youtube-dl must be installed! https://ytdl-org.github.io/youtube-dl/download.html'
  );
}

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-subscription-dl.json
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
const TOKEN_DIR = `${process.env.HOME ||
  process.env.HOMEPATH ||
  process.env.USERPROFILE}/.credentials/`;
const TOKEN_PATH = `${TOKEN_DIR}youtube-subscription-dl.json`;
const PROJECT_PATH = path.resolve(__dirname, '..');

// Load client secrets from a local file.
fs.readFile(`${PROJECT_PATH}/client_secret.json`, function processClientSecrets(err, content) {
  if (err) {
    console.log(`Error loading client secret file: ${err}`);
    return;
  }
  // Authorize a client with the loaded credentials, then call the YouTube API.
  authorize(JSON.parse(content), fetchVideos);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
    if (err) throw err;
    console.log(`Token stored to ${TOKEN_PATH}`);
  });
  console.log(`Token stored to ${TOKEN_PATH}`);
}
