# Server Handler — API Reference

All endpoints are prefixed with `/servers`.

## Authentication

Every request must include the `api_secret` value from `lib/config.json` as the `Authorization` header. Requests without it, or with an incorrect value, will receive a `401` response with no body.

```
Authorization: your-api-secret
```

---

## Servers

### GET `/servers`

Returns all servers.

**Response `200`**

```json
[
  {
    "id": 1,
    "name": "survival",
    "port": 19132,
    "backup_speed": 60,
    "backup_retention": 5,
    "restart_times": "[\"00:00\",\"12:00\"]",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### GET `/servers/:id`

Returns a single server by ID.

**Path Parameters**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `id`      | `number` | Server ID   |

**Response `200`**

```json
{
  "id": 1,
  "name": "survival",
  "port": 19132,
  "backup_speed": 60,
  "backup_retention": 5,
  "restart_times": "[\"00:00\",\"12:00\"]",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

**Response `400`** — Invalid ID

```json
{ "error": "Invalid server ID!" }
```

**Response `404`** — Server not found

```json
{ "error": "Server not found!" }
```

---

### GET `/servers/self`

Identifies the calling server based on its container IP. Intended for use by game servers calling back into the API to identify themselves.

**Response `200`** — Returns the server object for the caller (same shape as `GET /servers/:id`)

**Response `404`** — No server matched the caller's IP

```json
{ "error": "Could not find server ID based off your IP!" }
```

---

### POST `/servers/create`

Creates a new server from a template.

**Request Body**

| Field       | Type      | Required | Description                                                                            |
| ----------- | --------- | -------- | -------------------------------------------------------------------------------------- |
| `name`      | `string`  | ✅       | Server name. No spaces allowed. Must be unique.                                        |
| `port`      | `number`  | ❌       | UDP port for the server. Randomly assigned from `api_port_range` in config if omitted. |
| `template`  | `string`  | ❌       | Template folder name under `lib/templates/`. Defaults to `default`.                    |
| `autostart` | `boolean` | ❌       | Whether to start the server immediately after creation. Defaults to `false`.           |
| `cpu_limit` | `number`  | ❌       | CPU thread limit for the container (e.g. `1` or `0.5`). Omit for no limit.             |
| `ram_limit` | `number`  | ❌       | RAM limit in MB (e.g. `512` for 512 MB). Omit for no limit.                            |

```json
{
  "name": "survival",
  "port": 19132,
  "template": "default",
  "autostart": true,
  "cpu_limit": 1,
  "ram_limit": 512
}
```

**Response `200`**

```json
{
  "id": 1,
  "port": 19132
}
```

**Response `400`** — Invalid or missing name

```json
{ "error": "Invalid server name!" }
```

**Response `409`** — Name or folder already taken

```json
{ "error": "Server name already taken!" }
```

```json
{ "error": "Server folder already exists!" }
```

**Response `400`** — Template not found

```json
{ "error": "Invalid template!" }
```

**Response `500`** — Port could not be assigned

```json
{ "error": "Could not get random port!" }
```

---

### POST `/servers/:id/delete`

Stops and permanently deletes a server, including all its data and backups on disk.

> ⚠️ This action is irreversible.

**Path Parameters**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `id`      | `number` | Server ID   |

**Response `200`**

```json
{ "message": "Server deleted successfully!" }
```

**Response `400`** — Invalid ID

```json
{ "error": "Invalid server ID!" }
```

**Response `404`** — Server not found

```json
{ "error": "Server not found!" }
```

---

## Server Lifecycle

### POST `/servers/:id/start`

Starts a server container.

**Path Parameters**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `id`      | `number` | Server ID   |

**Response `200`**

```json
{ "message": "Server started successfully!" }
```

**Response `400`** — Invalid ID

```json
{ "error": "Invalid server ID!" }
```

**Response `404`** — Server not found

```json
{ "error": "Server not found!" }
```

**Response `409`** — Already online

```json
{ "error": "Server is already online!" }
```

---

### POST `/servers/:id/stop`

Stops a running server container.

**Path Parameters**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `id`      | `number` | Server ID   |

**Response `200`**

```json
{ "message": "Server stopped successfully!" }
```

**Response `400`** — Invalid ID

```json
{ "error": "Invalid server ID!" }
```

**Response `404`** — Server not found

```json
{ "error": "Server not found!" }
```

**Response `409`** — Already offline

```json
{ "error": "Server is already offline!" }
```

---

### POST `/servers/:id/restart`

Stops and restarts a server. If the server is already offline, it will simply be started.

**Path Parameters**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `id`      | `number` | Server ID   |

**Response `200`**

```json
{ "message": "Server restarted successfully!" }
```

**Response `400`** — Invalid ID

```json
{ "error": "Invalid server ID!" }
```

**Response `404`** — Server not found

```json
{ "error": "Server not found!" }
```

---

## Server States

States are a live view of a server's runtime metrics — CPU, memory, TPS, players, and uptime. Game servers are expected to push their own state via `POST /servers/states/:id`. Stats like CPU and memory are pulled directly from Docker.

### GET `/servers/states`

Returns the runtime state of all servers.

**Response `200`** — Array of state objects. Each entry is either online or offline.

Offline:

```json
[
  {
    "id": 1,
    "online": false
  }
]
```

Online:

```json
[
  {
    "id": 1,
    "online": true,
    "tps": 20,
    "cpu": 4.5,
    "memory": 524288000,
    "uptime": "Up 2 hours",
    "players": [{ "username": "Steve" }]
  }
]
```

> `memory` is in bytes. `cpu` is a percentage. `uptime` is the raw Docker status string.

---

### GET `/servers/states/:id`

Returns the runtime state of a single server.

**Path Parameters**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `id`      | `number` | Server ID   |

**Response `200`** — Same shape as a single entry from `GET /servers/states`.

**Response `400`** — Invalid ID

```json
{ "error": "Invalid server ID!" }
```

**Response `404`** — Server not found

```json
{ "error": "Server not found!" }
```

---

### POST `/servers/states/:id`

Pushes a game server's runtime state (players and TPS) into the API cache. This is intended to be called by the game server itself on a regular interval.

**Path Parameters**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `id`      | `number` | Server ID   |

**Request Body**

| Field     | Type       | Required | Description                          |
| --------- | ---------- | -------- | ------------------------------------ |
| `tps`     | `number`   | ✅       | Current ticks per second             |
| `players` | `Player[]` | ✅       | Array of currently connected players |

```json
{
  "tps": 20,
  "players": [{ "username": "Steve" }]
}
```

**Response `200`**

```json
{ "message": "Server state updated successfully!" }
```

**Response `400`** — Invalid ID

```json
{ "error": "Invalid server ID!" }
```

**Response `400`** — Invalid body

```json
{ "error": "Invalid server state!" }
```

**Response `404`** — Server not found

```json
{ "error": "Server not found!" }
```

---

## Types

### `Server`

| Field              | Type             | Description                                                |
| ------------------ | ---------------- | ---------------------------------------------------------- |
| `id`               | `number`         | Auto-incremented primary key                               |
| `name`             | `string`         | Unique server name                                         |
| `port`             | `number`         | UDP port                                                   |
| `backup_speed`     | `number \| null` | Backup interval in minutes. `null` disables backups.       |
| `backup_retention` | `number`         | Max number of unprotected backups to keep                  |
| `restart_times`    | `string`         | JSON-encoded array of `"HH:mm"` UTC times                  |
| `cpu_limit`        | `number \| null` | CPU thread limit for the container. `null` means no limit. |
| `ram_limit`        | `number \| null` | RAM limit in MB. `null` means no limit.                    |
| `created_at`       | `string`         | ISO 8601 timestamp                                         |

### `Player`

| Field      | Type     | Description       |
| ---------- | -------- | ----------------- |
| `username` | `string` | Player's username |
