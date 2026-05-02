# Zentari Network | Server Handler

This tool was made for our network to manage our servers, but I decided to make this open source as I think it could be a very cool thing for the community to also have access to!

Made by Espryra, if you need to hit me up, reach me on discord! `espryra`

## Features

- Server Management
- Auto Backups
- Auto Rebooting
- Simple Updating

## Disclaimers

- This tool requires the following:
- A linux machine (Tested and made on Debian 13)
- Docker installed, with buildx
- Bun

## How to Use

### 1. Clone repository

```sh
git clone https://github.com/Zentari-Network/Server-Handler.git
```

### 2. Install dependencies

```sh
cd Server-Handler/ && bun install
```

### 3. Edit .env and lib/config.json

For the `.env` file, you just need to enter your discord id, and your discord token, like so:

```.env
DISCORD_ID=ID
DISCORD_TOKEN=TOKEN
```

For the `lib/config.json` file, all you need to change is the `allowed_role` value, to whatever role that you want to give permission to run commands for the bot.

**WARNING**: Only give that role to people you seriously trust, as they can delete the servers listed, and that will include the data, the backups, etc..

### 4. Start it!

```sh
bun start
```

This will instantly build the Docker image, used for the servers.

## Tips

### Updating servers

This tool should auto update your servers for you! All you have to do is whenever a new version of minecraft comes out, you just simply restart the service, and it will rebuild the image to the latest version of minecraft. Then, just simply restart your server, and there you go!

### Running in the background

You may find it annoying if you have to keep a terminal always open. I personally suggest using a tool such as **PM2**. PM2 is a process manager, and I personally use for a lot of my projects.

How to setup:

1. Install PM2

```sh
bun install -g pm2
```

2.  Setup start file

```sh
echo -e '#!/bin/bash\n\nbun start' > start.sh && chmod +x start.sh
```

3. Create PM2 process

```sh
pm2 start --name handler ./start.sh
```
