
# Youtube-subscription-dl

  

Use the youtube API to fetch your subscriptions automatically. Get an API key and then set the script as a cron job, no need to update lists of channels, just subscribe on youtube. Shows OS notifications when it finishes.

  

---

  

## Requirements:

  

#### [Node.js 10.15.3 (LTS) or higher](https://nodejs.org/en/)

  

#### [youtube-dl](http://ytdl-org.github.io/youtube-dl/download.html) installed.

  

#### If on linux `libnotify-bin` for OS notifications.

  

### Turn on the YouTube Data API (free, 10,000 queries/day)

  

- Use [this wizard](https://console.developers.google.com/flows/enableapi?apiid=youtube) to create or select a project in the Google Developers Console and automatically turn on the API. Click Continue, then Go to credentials.

  

- On the **Add credentials to your project** page, click the **Cancel** button.

  

- At the top of the page, select the **OAuth consent screen** tab. Select an **Email address**, enter a **Product name** if not already set, and click the **Save** button.

  

- Select the **Credentials** tab, click the **Create credentials** button and select **OAuth client ID**.

  

- Select the application type **Web Application**, enter the name "*YouTube Data API Quickstart*", and click the **Create** button.

  

- Click the edit icon for the application and add an **Authorized redirect URI** of `http://localhost:8080`

  

- Click **OK** to dismiss the resulting dialog.

  

- Click the **file_download (Download JSON)** button to the right of the client ID.

  

- Move the downloaded file to the **root path** of where you cloned this repo, and rename it **client_secret.json.**

  

### Set up youtube-dl.conf

  

This will be your config file to set up where files are saved and what extras you download, you can set it up however you want with many [options](https://github.com/ytdl-org/youtube-dl/blob/master/README.md#options) to pick from at the docs.

  
  

### If you want to use the config provided in this repo

  

it will:

  

- Automatically output to the /Downloads folder on your PC

- put them into their own folders per channel

- Remember previous downloads and skip them if they are reuploaded

- Create .mkv files instead of the default (usually .webm)

  

### To Save changes made to *youtube-dl.conf* or running it for the first time

  

`cp ./youtube-dl.conf ~/.config/youtube-dl.conf` will copy it to the correct folder on macos/linux, on windows you will have to create a file `%APPDATA%/youtube-dl/config.txt` and put the options in there.

  

---

  

## Running it for the first time

  

Run `npm install --production` to install dependencies

  

If on mac/linux, **make the script executable**  `sudo chmod +x ./yt-subs.sh`

  

Then run the script with `./yt-subs.sh` on mac/linux.

On windows use git bash (or another bash emulator) to `./yt-subs.sh`

  

When you run the command it will ask you to log in, you'll be authorizing yourself with the project you just made, when you're done you should get a `This site can’t be reached` error. Copy the code form the URL of the page (Starting from after the `=` in " ***...?code=...*** " all the way to before the `&` in " ***...&scope=...*** "), just paste the code into the console. **This only happens the first time.**
![copy](https://i.imgur.com/1hzkHMM.png)

  

The first time you run it, it will download your subscriptions from the past 24 hours.

  

Any times after that it will only download videos that have been uploaded since the last time it ran.

  

You can set it up as a cron job to be ran whenever you feel like it, and it will automatically keep track of the history and not repeat downloads.

  

---

  

## Other info

  

- If your internet connection disconnects or your change IP during a download, youtube-dl will crash after 30 seconds and retry the next 5 times the script runs.

  

- If the channel has a livestream or premiere it will skip them, the video that is uploaded after will be downloaded as expected.

  

- The config by default will download the best quality, [but you can limit to your liking it with options like these](https://askubuntu.com/questions/486297/how-to-select-video-quality-from-youtube-dl)

  

- If a file is partially downloaded it will continue where it left off.

  

- If the video was not found,or had some youtube error, the script will retry the download 5 times (once when you first run it, then again before the script ends, each time the script runs after that it will try again, until a total of 5)

  

- If you delete a video it won't re-download it, even if you delete the history.json file (which will re-download the last 24 hours as you won't have a history of the last download time)

  

- If you delete both the history.json file and the archive.txt file it will download videos from the past 24hours, but not override files still.

  

- Everything runs on your machine, nothing is shared with anyone but google, you spin up the server using your API keys and authorize your own account to yourself.