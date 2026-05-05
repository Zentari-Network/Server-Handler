# Zentari Network | Server Handler

A self-hosted Bedrock Dedicated Server manager built on Docker, Discord.js, and Bun. Manage your Minecraft servers entirely through Discord slash commands, with automatic backups, scheduled restarts, a REST API, and live container monitoring — all from one process.

Made by **Espryra** — hit me up on Discord: `espryra`

> **Recommended:** Install the [Server Handler Uploader BP](https://github.com/Zentari-Network/Server-Handler-BP) on each server managed by this handler. It allows your Minecraft servers to report their TPS and player count directly to the API.

---

## Features

- **Server Management** — Create, start, stop, restart, and delete servers via Discord or the REST API
- **Auto Backups** — Configurable per-server backup intervals with retention policies and protected backups
- **Scheduled Restarts** — Set daily restart times per server with in-game countdown warnings
- **Live Monitoring** — CPU, memory, uptime, TPS, and player counts pulled in real time from Docker
- **REST API** — Optional HTTP API for external integrations (e.g. game servers reporting their own state)
- **Auto Updating** — On startup, the latest Bedrock Dedicated Server version is fetched and the Docker image is rebuilt automatically
- **Graceful Shutdown** — SIGTERM and SIGINT are caught; the Discord client is cleanly destroyed before exit

---

## Requirements

- A Linux machine (tested on Debian 13)
- [Docker](https://docs.docker.com/engine/install/) with Buildx
- [Bun](https://bun.sh)

---

## Setup

### 1. Clone the repository

```sh
git clone https://github.com/Zentari-Network/Server-Handler.git
cd Server-Handler/
```

### 2. Install dependencies

```sh
bun install
```

### 3. Configure your environment

Create a `.env` file in the root of the project:

```env
DISCORD_ID=your_discord_application_id
DISCORD_TOKEN=your_discord_bot_token
```

### 4. Edit `lib/config.json`

```json
{
  "allowed_role": "YOUR_ROLE_ID",

  "api_enabled": false,
  "api_port": 3000,
  "api_secret": "CHANGE ME IF USED",
  "api_port_range": [50000, 51000],

  "log_update_speed": 1
}
```

| Field              | Description                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowed_role`     | Discord role ID that is permitted to use bot commands. Only give this to people you fully trust — they can delete servers and all their data. |
| `api_enabled`      | Enables the REST API. Disabled by default.                                                                                                    |
| `api_port`         | Port the REST API listens on.                                                                                                                 |
| `api_secret`       | Secret used to authenticate API requests via the `Authorization` header.                                                                      |
| `api_port_range`   | Port range used when auto-assigning ports to new servers created via the API.                                                                 |
| `log_update_speed` | How often (in seconds) console logs are pulled from each container and written to disk.                                                       |

### 5. Start it

```sh
bun start
```

On first run, the Docker image for Bedrock Dedicated Server will be built automatically. This may take a few minutes depending on your connection speed.

---

## Running in the Background

Use [PM2](https://pm2.keymetrics.io/) to keep the handler alive without an open terminal.

```sh
# Install PM2
bun install -g pm2

# Create a start script
echo -e '#!/bin/bash\n\nbun start' > start.sh && chmod +x start.sh

# Register it with PM2
bun x pm2 start --name handler ./start.sh
```

---

## How It Works

### Startup Sequence

When launched, modules initialize in this order:

1. **ConfigHandler** — Loads `lib/config.json` and `.env`
2. **DockerHandler** — Begins building the BDS Docker image (fetches the latest version from the Minecraft wiki automatically)
3. **DatabaseHandler** — Opens `data/database.db` (Bun SQLite) and creates tables if they don't exist
4. **APIHandler** — Starts the Express REST API (if enabled in config)
5. **BackupHandler** — Starts the per-minute backup polling loop
6. **RestartHandler** — Starts the per-minute restart schedule loop and also handles auto reboot for servers that have it enabled.
7. **DiscordHandler** — Loads and deploys slash commands, then logs the bot in
8. **ExitHandler** — Registers SIGTERM/SIGINT listeners for graceful shutdown

### Docker Containers

Each server runs as an isolated Docker container named `server_<id>`. Server data (worlds, configs, packs, allowlist, permissions) is mounted into the container as volumes, so data persists across restarts. Console logs are written to `data/servers/<name>/console.log` every `log_update_speed` seconds.

### Backups

Backups are `tar.gz` archives of each server's `data/` directory, stored at `data/servers/<name>/backups/<id>.tar.gz`. Each server has independently configurable:

- **Backup speed** — how often (in minutes) an automatic backup is created. `null` disables auto-backups.
- **Retention** — how many unprotected backups to keep. Older ones are deleted automatically after each new backup.
- **Protected backups** — flagged backups are excluded from retention deletion and must be managed manually.

Restoring a backup requires the server to be **offline** and will **replace all current server data**.

### Scheduled Restarts

Each server stores a JSON array of `"HH:mm"` UTC times in its `restart_times` field. Once per minute, the restart handler checks if the current time matches any scheduled time for an online server. When a match is found, the restart countdown sequence from `data/servers/<name>/restart_countdown.json` is executed.

The default countdown sequence sends in-game warnings at 60s, 30s, 15s, 5s, and counts down from 4 before kicking all players and stopping the container:

```json
[
  { "commands": ["say Server restarting in 60 seconds!"], "delay": 30 },
  { "commands": ["say Server restarting in 30 seconds!"], "delay": 15 },
  { "commands": ["say Server restarting in 15 seconds!"], "delay": 10 },
  { "commands": ["say Server restarting in 5 seconds!"],  "delay": 1  },
  ...
  { "commands": ["kick @a Server restarting now!"],        "delay": 1  }
]
```

Each entry runs its `commands` against the server, then waits `delay` seconds before the next entry. You can customize this file per server.

### Templates

When a server is created, its file structure is copied from a template folder under `lib/templates/`. The `default` template is used if none is specified. Templates contain:

- `restart_countdown.json` — the countdown sequence for that server
- `data/` — the initial server data directory (worlds, configs, packs, allowlist, permissions, server.properties)

To create a custom template, duplicate `lib/templates/default/` and modify as needed. Reference it by folder name when creating a server.

---

## Discord Commands

All commands require the `allowed_role` configured in `lib/config.json`.

### `/server`

| Subcommand       | Description                                                                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createskeleton` | Creates a server directory and registers it. Args: `name` (required), `port` (required), `template` (optional), `cpu_limit` (optional, in threads e.g. `1` or `0.5`), `ram_limit` (optional, in MB e.g. `512`) |
| `start`          | Starts a server container                                                                                                                                                                                      |
| `stop`           | Stops a running server container                                                                                                                                                                               |
| `restart`        | Restarts a server (starts it if it was offline)                                                                                                                                                                |
| `execute`        | Runs a command inside a server container                                                                                                                                                                       |
| `delete`         | Permanently deletes a server and all its data. Requires typing `DELETE MY SERVER` to confirm                                                                                                                   |
| `list`           | Lists all servers with live status, performance stats, player count, and backup info                                                                                                                           |
| `log`            | Sends the Docker container's log output (last 1000 lines) as a file attachment                                                                                                                                 |
| `config`         | View or update a server's port, backup speed, backup retention, restart times, CPU and RAM limits, and auto reboot. Run with only `name` to view current config                                                |

### `/backups`

| Subcommand | Description                                                                           |
| ---------- | ------------------------------------------------------------------------------------- |
| `create`   | Creates a backup. Optionally set a name and mark it as protected                      |
| `list`     | Lists all backups for a server, grouped by protected/unprotected                      |
| `restore`  | Restores a backup by ID. Server must be offline. **Replaces all current server data** |
| `update`   | Updates a backup's name or protected status                                           |

### `/ping`

Checks if the bot is online. Responds with `Pong!` (ephemeral).

---

## REST API

The API is disabled by default. Enable it by setting `api_enabled: true` in `lib/config.json`.

All requests require the `Authorization` header set to your `api_secret`. See [`docs/API.md`](docs/API.md) for the full endpoint reference.

---

## Updating Servers

When a new version of Minecraft Bedrock is released, simply restart the handler. On startup it will automatically fetch the latest version from the Minecraft wiki and rebuild the Docker image. Once built, restart any running servers through Discord or the API to have them pick up the new image.

---

## Data Directory Structure

```
data/
└── servers/
    └── <server-name>/
        ├── data/               # Mounted into the Docker container
        │   ├── worlds/
        │   ├── config/
        │   ├── development_behavior_packs/
        │   ├── development_resource_packs/
        │   ├── allowlist.json
        │   ├── permissions.json
        │   └── server.properties
        ├── backups/            # Backup archives (<id>.tar.gz)
        ├── console.log         # Latest container log output
        └── restart_countdown.json
```
