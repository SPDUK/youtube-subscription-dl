## Requirements:

#### [Node.js 10.15.13 (LTS) or higher](https://nodejs.org/en/)

#### [youtube-dl](http://ytdl-org.github.io/youtube-dl/download.html) installed.

### Turn on the YouTube Data API

- Use [this wizard](https://console.developers.google.com/flows/enableapi?apiid=youtube) to create or select a project in the Google Developers Console and automatically turn on the API. Click Continue, then Go to credentials.

- On the Add credentials to your project page, click the Cancel button.

- At the top of the page, select the OAuth consent screen tab. Select an Email address, enter a Product name if not already set, and click the Save button.

- Select the Credentials tab, click the Create credentials button and select OAuth client ID.

- Select the application type Other, enter the name "YouTube Data API Quickstart", and click the Create button.

- Click OK to dismiss the resulting dialog.

- Click the file_download (Download JSON) button to the right of the client ID.

- Move the downloaded file to the **root path** of where you cloned this repo, and rename it **client_secret.json.**

### Set up youtube-dl.conf

This will be your config file to set up where files are saved and what info you download, you can set it up however you want with many [options](https://github.com/ytdl-org/youtube-dl/blob/master/README.md#options) to pick from at the docs.

### If you want to use the config provided in this repo

it will:

- Automatically output to the /Downloads folder on your PC
- put them into their own folders per channel
- Remember previous downloads and skip them
- Create .mkv files instead of the default (usually .webm)

`mv ./youtube-dl.conf ~/.config/youtube-dl.conf` will move it to the correct folder on macos/linux, on windows you will have to create a file `%APPDATA%/youtube-dl/config.txt` and put the options in there.

## Running it for the first time

Run `npm install`

Then run the script with `./yt-subs.sh` or `./yt-subs.bat`

When you run the command it will ask you to log in, you'll be authorizing yourself with the project you just made,when you're done just paste the code into the console. **This only happens the first time.**

The first time you run it, it will download your subscriptions from the past 24 hours.

Any times after that it will only download videos that have been uploaded since the last time it ran.

You can set it up as a cron job to be ran whenever you feel like it, and it will automatically keep track of the history and not repeat downloads.
