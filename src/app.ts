import { Tturn } from "./index";

const APP_CONFIG = {
  realm: "turn.example.com",
  authSecret: "replace-with-your-secret",
  publicIp: "1.2.3.4",
  listenPort: 3478,
  ttlSec: 600
};

async function main(): Promise<void> {
  const service = new Tturn({
    realm: APP_CONFIG.realm,
    authSecret: APP_CONFIG.authSecret,
    publicIp: APP_CONFIG.publicIp,
    listenPort: APP_CONFIG.listenPort
  });

  await service.start();

  const ice = service.issueCredential({ ttlSec: APP_CONFIG.ttlSec, userId: "google-test" });
  console.log("[tturn] started.");
  console.log("[tturn] use this ICE server in Google WebRTC tool:");
  console.log(JSON.stringify(ice, null, 2));
  console.log("[tturn] health:", service.health());
  console.log("[tturn] press Ctrl+C to stop.");

  await waitForSignal();
  await service.stop();
  console.log("[tturn] stopped.");
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

main().catch((error) => {
  console.error(`[tturn] startup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
