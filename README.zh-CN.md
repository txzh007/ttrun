# Tturn（中文）

[English（主文档）](./README.md) | [中文](./README.zh-CN.md)

`tturn` 是一个高性能的 Node.js TURN 服务包。
它使用内嵌原生核心（Rust + N-API），可以直接通过 npm 安装并运行，不依赖 Docker，也不需要额外安装 `turnserver.exe` 作为运行时。

## 1）项目介绍

- `tturn` 是一个可直接在 Node.js 中运行的 TURN 服务包。
- 底层是 Rust + N-API 原生实现，性能和资源效率优于纯 JS TURN 实现。
- 不依赖 Docker，也不需要额外安装 `turnserver.exe` 作为运行时。
- 同时提供 Node API 和 CLI 两种使用方式。

## 2）当前功能

- 在 Node 中启动 / 停止 TURN 服务。
- 生成短时效 TURN 凭证（HMAC-SHA1）。
- 直接输出 WebRTC 所需的 ICE 参数（`urls/username/credential`）。
- 基础健康状态检查（`running: boolean`）。

## 3）安装

```bash
npm i tturn
```

## 4）Node API 快速使用

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

`start()` 会直接返回一组 ICE，因此最简流程只需要 `new Tturn(...)` 和 `start()`。

如果你需要长时间持续连接，可设置 `disableCredentialExpiry: true`，生成不过期凭证。

在静态账号密码模式（`password` + `username`）下：

- 输出的 `username` 就是你配置的账号
- 输出的 `credential` 就是你配置的密码

## 5）CLI 用法

```bash
# 启动内置 TURN 服务
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret tturn start

# 生成一组 ICE 凭证
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret tturn credential

# 可选：传入自定义 username
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret TTURN_USERNAME=alice tturn credential

# 可选：禁用凭证过期（长期凭证）
TURN_REALM=turn.example.com TURN_SECRET=replace-with-your-secret TTURN_USERNAME=alice TTURN_DISABLE_CREDENTIAL_EXPIRY=1 tturn credential

# 静态账号密码（原样输出，不改写）
TURN_REALM=turn.example.com TURN_USERNAME=alice TURN_PASSWORD=alice-pass TTURN_DISABLE_CREDENTIAL_EXPIRY=1 tturn start
```

## 5.1）凭证参数补充（username）

`issueCredential(options)` 额外支持 `username`（可选）。

- 如果 `username` 已经以未来时间戳结尾（例如 `alice:1730000000`），会原样使用。
- 否则会自动补上 `:<expiresAt>`，保证 TURN 鉴权可用。
- 同时传 `username` 和 `userId` 时，优先使用 `username`。

## 6）配置参数说明

- `realm`（必填）：TURN realm / 域名。
- `authSecret`（可选）：动态凭证签名密钥。
- `password`（可选）：静态 TURN 密码（设置后返回值保持固定）。
- `listenPort`（默认 `3478`）：TURN 监听端口。
- `publicIp`（建议配置）：客户端访问的公网 IP。
- `listeningIp`（默认 `0.0.0.0`）：本地绑定地址。
- `username` / `userId`（可选）：默认凭证用户名种子，`username` 优先级更高。
- `ttlSec`（可选）：`start()` 与 `issueCredential()` 的默认凭证时效。
- `disableCredentialExpiry`（可选）：禁用时间戳过期校验，生成不过期凭证。
- `minPort` / `maxPort`：中继分配端口范围（已在 native TURN 分配器中生效）。

`authSecret` 和 `password` 至少需要提供一个。

## 6.1）快速验证

```bash
npm install
npm run build

TURN_REALM=turn.example.com TURN_PUBLIC_IP=1.2.3.4 TURN_USERNAME=alice TURN_PASSWORD=alice-pass TTURN_DISABLE_CREDENTIAL_EXPIRY=1 node dist/cli.js credential
```

返回 JSON 中应保持 `username = "alice"`、`credential = "alice-pass"`。

## 7）源码构建

环境要求：

- Node.js >= 18
- Rust 稳定版工具链

构建命令：

```bash
npm install
npm run build:native
./node_modules/.bin/tsc -p tsconfig.json
```

运行示例：

```bash
node dist/app.js
```

运行前请先修改 `src/app.ts` 中的固定配置项。

## 8）使用 Google WebRTC 工具验证

1. 启动服务：`node dist/app.js`
2. 复制控制台打印的 `urls`、`username`、`credential`
3. 打开 Google Trickle ICE 页面，填入 ICE Server
4. 执行采集并确认出现 relay candidate

## 9）发布到 npm

```bash
npm login
npm publish --access public
```

说明：

- npm 包名必须小写，所以发布名为 `tturn`。
- 生产环境建议按平台预编译并发布对应 `.node` 二进制文件。
