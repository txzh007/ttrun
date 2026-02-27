# Tturn

[English (default)](./README.md) | [中文](./README.zh-CN.md)

`tturn` is a high-performance TURN server package for Node.js.
It embeds a native Rust core via N-API, so you can install from npm and run directly.

- No Docker runtime required.
- No external `turnserver.exe` runtime dependency.
- Programmatic API and CLI are both included.

## What this project provides

- Embedded TURN service for Node.js applications.
- Native data plane implemented in Rust.
- Dynamic TURN credentials using HMAC-SHA1 (TURN REST style).
- Direct ICE payload output (`urls`, `username`, `credential`).

## Install

```bash
npm i tturn
```

## Quick start (Node API)

```ts
import { Tturn } from "tturn";

const turn = new Tturn({
  realm: "turn.example.com",
  password: "replace-with-your-password",
  publicIp: "1.2.3.4",
  listenPort: 3478,
  username: "user-1001",
  disableCredentialExpiry: true
});

const ice = await turn.start();

console.log(ice);
await turn.stop();
```

`start()` now returns one ICE payload directly, so bootstrap can be only `new Tturn(...)` + `start()`.

For long-running sessions, set `disableCredentialExpiry: true` to issue non-expiring credentials.

With static password mode (`password` + `username`), what you set is what clients use:

- output `username` is exactly your configured username
- output `credential` is exactly your configured password

## Credential options

`issueCredential(options)` supports:

- `ttlSec` (optional, default `3600`, minimum `60`)
- `username` (optional): pass a custom TURN username
- `userId` (optional): legacy prefix mode (`userId:expiresAt`)

Username behavior:

- If `username` already ends with a future unix timestamp (for example `alice:1730000000`), it is used as-is.
- Otherwise, `tturn` appends `:<expiresAt>` automatically so TURN auth remains valid.
- If both `username` and `userId` are provided, `username` takes priority.

## CLI usage

```bash
# Start embedded TURN service
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret tturn start

# Print one ICE credential payload
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret tturn credential

# Optional: provide custom username
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret TTURN_USERNAME=alice tturn credential

# Optional: disable credential expiry (long-lived credentials)
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret TTURN_USERNAME=alice TTURN_DISABLE_CREDENTIAL_EXPIRY=1 tturn credential

# Static account/password (exact value, no rewrite)
TURN_REALM=turn.example.com TURN_USERNAME=alice TURN_PASSWORD=alice-pass TTURN_DISABLE_CREDENTIAL_EXPIRY=1 tturn start
```

Required env:

- `TURN_REALM`
- `TURN_SECRET` or `TURN_PASSWORD`

Optional env:

- `TURN_PUBLIC_IP`
- `TURN_PORT`
- `TURN_MIN_PORT`
- `TURN_MAX_PORT`
- `TTURN_TTL_SEC`
- `TTURN_USER_ID`
- `TTURN_USERNAME` (or `TURN_USERNAME`)
- `TTURN_DISABLE_CREDENTIAL_EXPIRY` (`1` or `true`)

## API options

- `realm` (required): TURN realm/domain.
- `authSecret` (optional): shared secret for dynamic credentials.
- `password` (optional): static TURN password (when set, returned credential stays fixed).
- `listenPort` (default `3478`): TURN listening port.
- `publicIp` (optional, recommended): public relay IP exposed to clients.
- `listeningIp` (default `0.0.0.0`): bind address.
- `username` / `userId` (optional): default credential username seed. `username` has higher priority.
- `ttlSec` (optional): default credential TTL used by `start()` and `issueCredential()`.
- `disableCredentialExpiry` (optional): disable timestamp expiry check and issue non-expiring credentials.
- `minPort` / `maxPort`: relay allocation port range (effective in native TURN allocator).

At least one of `authSecret` or `password` must be provided.

## Quick verify

```bash
npm install
npm run build

TURN_REALM=turn.example.com TURN_PUBLIC_IP=1.2.3.4 TURN_USERNAME=alice TURN_PASSWORD=alice-pass TTURN_DISABLE_CREDENTIAL_EXPIRY=1 node dist/cli.js credential
```

The returned JSON should keep `username = "alice"` and `credential = "alice-pass"`.

## Build from source

Requirements:

- Node.js >= 18
- Rust toolchain (stable)

```bash
npm install
npm run build:native
npm run build:ts
```

Run demo:

```bash
node dist/app.js
```
