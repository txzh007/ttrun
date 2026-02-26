#!/usr/bin/env node

import { createTurnService } from "./index";

async function run(): Promise<void> {
  const command = process.argv[2];

  if (command === "credential") {
    const secret = mustGetEnv("TURN_SECRET");
    const realm = mustGetEnv("TURN_REALM");
    const service = createTurnService({ realm, authSecret: secret, publicIp: process.env.TURN_PUBLIC_IP });
    const ice = service.issueCredential({
      ttlSec: process.env.TTURN_TTL_SEC ? Number(process.env.TTURN_TTL_SEC) : 3600,
      userId: process.env.TTURN_USER_ID
    });
    process.stdout.write(`${JSON.stringify(ice, null, 2)}\n`);
    return;
  }

  if (command === "start") {
    const secret = mustGetEnv("TURN_SECRET");
    const realm = mustGetEnv("TURN_REALM");
    const service = createTurnService({
      realm,
      authSecret: secret,
      publicIp: process.env.TURN_PUBLIC_IP,
      listenPort: process.env.TURN_PORT ? Number(process.env.TURN_PORT) : 3478
    });
    await service.start();
    process.stdout.write("tturn started\n");

    await waitForSignal();
    await service.stop();
    process.stdout.write("tturn stopped\n");
    return;
  }

  printUsage();
  process.exitCode = 1;
}

function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function printUsage(): void {
  process.stdout.write(
    [
      "tturn usage:",
      "  tturn start       # starts embedded native TURN service",
      "  tturn credential  # prints one ICE server credential JSON",
      "",
      "required env:",
      "  TURN_REALM, TURN_SECRET",
      "optional env:",
      "  TURN_PUBLIC_IP, TURN_PORT, TTURN_TTL_SEC, TTURN_USER_ID"
    ].join("\n") + "\n"
  );
}

function waitForSignal(): Promise<void> {
  return new Promise((resolve) => {
    const keepAlive = setInterval(() => {
      // Keep Node event loop active while native TURN runs.
    }, 60_000);

    const onSignal = () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      clearInterval(keepAlive);
      resolve();
    };

    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
  });
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
