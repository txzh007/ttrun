# Tturn (English)

[English](./README.en.md) | [中文](./README.zh-CN.md)

`tturn` is a high-performance TURN server package for Node.js.
It uses an embedded native core (Rust + N-API), so you can install and run it directly from npm without Docker and without an external `turnserver.exe` runtime dependency.

## 1) What this project is

- Embedded TURN server for Node.js applications.
- Native data plane implemented in Rust for better throughput and lower overhead than pure JavaScript TURN implementations.
- Programmatic API and CLI are both provided.
- Time-limited TURN credentials are generated with HMAC-SHA1 (standard TURN REST style).

## 2) Current capabilities

- Start / stop TURN service from Node.
- Issue short-lived credentials.
- Return WebRTC ICE `urls/username/credential` directly.
- Health check (`running: boolean`).

## 3) Install

```bash
npm i tturn
```

## 4) Quick start (Node API)

```ts
import { Tturn } from "tturn";

const turn = new Tturn({
  realm: "turn.example.com",
  authSecret: "replace-with-your-secret",
  publicIp: "1.2.3.4",
  listenPort: 3478
});

await turn.start();

const ice = turn.issueCredential({ ttlSec: 600, userId: "user-1001" });
console.log(ice);

// stop when exiting process
await turn.stop();
```

## 5) CLI usage

```bash
# Start embedded TURN service
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret tturn start

# Print one ICE credential payload
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret tturn credential
```

## 6) API options

- `realm` (required): TURN realm/domain.
- `authSecret` (required): shared secret for dynamic credentials.
- `listenPort` (default `3478`): TURN listening port.
- `publicIp` (optional, recommended): public relay IP exposed to clients.
- `listeningIp` (default `0.0.0.0`): bind address.
- `minPort` / `maxPort`: reserved for relay port range control in next iterations.

## 7) Build from source

Requirements:

- Node.js >= 18
- Rust toolchain (stable)

Commands:

```bash
npm install
npm run build:native
./node_modules/.bin/tsc -p tsconfig.json
```

Then run demo app:

```bash
node dist/app.js
```

Edit fixed config in `src/app.ts` before running.

## 8) Verify with Google WebRTC tool

1. Start service (`node dist/app.js`).
2. Copy printed `urls`, `username`, `credential`.
3. Open Google Trickle ICE tool and paste the ICE server config.
4. Gather candidates and confirm relay candidates are returned.

## 9) Publish to npm

```bash
npm login
npm publish --access public
```

Notes:

- npm package names must be lowercase, so publish as `tturn`.
- For production users across multiple platforms, publish prebuilt `.node` artifacts for each target platform/arch.
