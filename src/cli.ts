#!/usr/bin/env node

import { createTurnService } from "./index";

async function run(): Promise<void> {
  const command = process.argv[2];

  if (command === "credential") {
    const realm = mustGetEnv("TURN_REALM");
    const authOptions = resolveAuthOptions();
    const service = createTurnService({
      realm,
      authSecret: authOptions.authSecret,
      password: authOptions.password,
      publicIp: process.env.TURN_PUBLIC_IP,
      listenPort: readPortEnv("TURN_PORT") ?? 3478,
      minPort: readPortEnv("TURN_MIN_PORT"),
      maxPort: readPortEnv("TURN_MAX_PORT"),
      disableCredentialExpiry: readBoolEnv("TTURN_DISABLE_CREDENTIAL_EXPIRY") ?? Boolean(authOptions.password)
    });
    const ice = service.issueCredential({
      ttlSec: readPositiveIntEnv("TTURN_TTL_SEC") ?? 3600,
      userId: process.env.TTURN_USER_ID,
      username: readUsernameEnv()
    });
    process.stdout.write(`${JSON.stringify(ice, null, 2)}\n`);
    return;
  }

  if (command === "start") {
    const realm = mustGetEnv("TURN_REALM");
    const authOptions = resolveAuthOptions();
    const service = createTurnService({
      realm,
      authSecret: authOptions.authSecret,
      password: authOptions.password,
      publicIp: process.env.TURN_PUBLIC_IP,
      listenPort: readPortEnv("TURN_PORT") ?? 3478,
      minPort: readPortEnv("TURN_MIN_PORT"),
      maxPort: readPortEnv("TURN_MAX_PORT"),
      ttlSec: readPositiveIntEnv("TTURN_TTL_SEC") ?? 3600,
      username: readUsernameEnv(),
      userId: process.env.TTURN_USER_ID,
      disableCredentialExpiry: readBoolEnv("TTURN_DISABLE_CREDENTIAL_EXPIRY") ?? Boolean(authOptions.password)
    });
    const ice = await service.start();
    process.stdout.write("tturn started\n");
    process.stdout.write(`${JSON.stringify(ice, null, 2)}\n`);

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
      "  TURN_REALM",
      "  TURN_SECRET or TURN_PASSWORD",
      "optional env:",
      "  TURN_PUBLIC_IP, TURN_PORT, TURN_MIN_PORT, TURN_MAX_PORT, TTURN_TTL_SEC, TTURN_USER_ID, TTURN_USERNAME (or TURN_USERNAME), TTURN_DISABLE_CREDENTIAL_EXPIRY"
    ].join("\n") + "\n"
  );
}

function readUsernameEnv(): string | undefined {
  return process.env.TTURN_USERNAME ?? process.env.TURN_USERNAME;
}

function resolveAuthOptions(): { authSecret: string; password?: string } {
  const authSecret = process.env.TURN_SECRET;
  const password = process.env.TURN_PASSWORD;
  if (!authSecret && !password) {
    throw new Error("Missing required env: TURN_SECRET or TURN_PASSWORD");
  }

  return {
    authSecret: authSecret ?? "",
    password
  };
}

function readBoolEnv(name: string): boolean | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  return value === "1" || value.toLowerCase() === "true";
}

function readPositiveIntEnv(name: string): number | undefined {
  const value = process.env[name];
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid env ${name}: expected a positive integer`);
  }

  return parsed;
}

function readPortEnv(name: string): number | undefined {
  const value = process.env[name];
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid env ${name}: expected an integer between 1 and 65535`);
  }

  return parsed;
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
