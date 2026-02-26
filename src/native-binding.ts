import { existsSync } from "node:fs";
import { join } from "node:path";
import { TurnServiceOptions } from "./types";

interface NativeCredential {
  username: string;
  password: string;
  ttlSec: number;
  expiresAt: number;
}

interface NativeTurnService {
  start(detached?: boolean): void;
  stop(): void;
  issueCredential(ttlSec?: number, userId?: string): NativeCredential;
  getIceUrls(): string[];
  health(): { running: boolean };
}

interface NativeBinding {
  NativeTurnService: new (options: TurnServiceOptions) => NativeTurnService;
}

function loadNativeBinding(): NativeBinding {
  const root = join(__dirname, "..");
  const candidates = [
    join(root, "index.node"),
    join(root, "native", "index.node"),
    join(root, binaryName())
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) {
      continue;
    }
    return require(filePath) as NativeBinding;
  }

  throw new Error(
    [
      "Native binding not found.",
      "Run `npm run build:native` before using Tturn in development.",
      "For published builds, ensure prebuilt `.node` artifacts are bundled."
    ].join(" ")
  );
}

function binaryName(): string {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "win32") {
    return `tturn.${platform}-${arch}-msvc.node`;
  }
  return `tturn.${platform}-${arch}.node`;
}

const binding = loadNativeBinding();

export type { NativeTurnService, NativeCredential };
export { binding };
