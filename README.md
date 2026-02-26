# Tturn

English | 中文

`tturn` is a high-performance TURN server package for Node.js.
It uses an embedded native core (Rust + N-API), so you can install and run it directly from npm without Docker and without an external `turnserver.exe` runtime dependency.

---

## English

### 1) What this project is

- Embedded TURN server for Node.js applications.
- Native data plane implemented in Rust for better throughput and lower overhead than pure JavaScript TURN implementations.
- Programmatic API and CLI are both provided.
- Time-limited TURN credentials are generated with HMAC-SHA1 (standard TURN REST style).

### 2) Current capabilities

- Start / stop TURN service from Node.
- Issue short-lived credentials.
- Return WebRTC ICE `urls/username/credential` directly.
- Health check (`running: boolean`).

### 3) Quick start (Node API)

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

### 4) CLI usage

```bash
# Start embedded TURN service
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret tturn start

# Print one ICE credential payload
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret tturn credential
```

### 5) API options

- `realm` (required): TURN realm/domain.
- `authSecret` (required): shared secret for dynamic credentials.
- `listenPort` (default `3478`): TURN listening port.
- `publicIp` (optional, recommended): public relay IP exposed to clients.
- `listeningIp` (default `0.0.0.0`): bind address.
- `minPort` / `maxPort`: reserved for relay port range control in next iterations.

### 6) Build from source

Requirements:

- Node.js >= 18
- Rust toolchain (stable)

Commands:

```bash
npm install
npm run build:native
npm run build:ts
```

Then run demo app:

```bash
node dist/app.js
```

Edit fixed config in `src/app.ts` before running.

### 7) Verify with Google WebRTC tool

1. Start service (`node dist/app.js`).
2. Copy printed `urls`, `username`, `credential`.
3. Open Google Trickle ICE tool and paste the ICE server config.
4. Gather candidates and confirm relay candidates are returned.

### 8) Publish to npm

```bash
npm login
npm publish --access public
```

Notes:

- npm package names must be lowercase, so publish as `tturn`.
- For production users across multiple platforms, publish prebuilt `.node` artifacts for each target platform/arch.

---

## 中文

### 1）项目介绍

- `tturn` 是一个可直接在 Node.js 中运行的 TURN 服务包。
- 底层是 Rust + N-API 原生实现，性能和资源效率优于纯 JS TURN 实现。
- 不依赖 Docker，也不需要额外安装 `turnserver.exe` 作为运行时。
- 同时提供 Node API 和 CLI 两种使用方式。

### 2）当前功能

- 在 Node 中启动 / 停止 TURN 服务。
- 生成短时效 TURN 凭证（HMAC-SHA1）。
- 直接输出 WebRTC 所需的 ICE 参数（`urls/username/credential`）。
- 基础健康状态检查（`running: boolean`）。

### 3）Node API 快速使用

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

await turn.stop();
```

### 4）CLI 用法

```bash
# 启动内置 TURN 服务
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret tturn start

# 生成一组 ICE 凭证
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret tturn credential
```

### 5）配置参数说明

- `realm`（必填）：TURN realm / 域名。
- `authSecret`（必填）：动态凭证签名密钥。
- `listenPort`（默认 `3478`）：TURN 监听端口。
- `publicIp`（建议配置）：客户端访问的公网 IP。
- `listeningIp`（默认 `0.0.0.0`）：本地绑定地址。
- `minPort` / `maxPort`：预留给后续中继端口范围控制。

### 6）源码构建

环境要求：

- Node.js >= 18
- Rust 稳定版工具链

构建命令：

```bash
npm install
npm run build:native
npm run build:ts
```

运行示例：

```bash
node dist/app.js
```

运行前请先修改 `src/app.ts` 中的固定配置项。

### 7）使用 Google WebRTC 工具验证

1. 启动服务：`node dist/app.js`
2. 复制控制台打印的 `urls`、`username`、`credential`
3. 打开 Google Trickle ICE 页面，填入 ICE Server
4. 执行采集并确认出现 relay candidate

### 8）发布到 npm

```bash
npm login
npm publish --access public
```

说明：

- npm 包名必须小写，所以发布名为 `tturn`。
- 生产环境建议按平台预编译并发布对应 `.node` 二进制文件。
