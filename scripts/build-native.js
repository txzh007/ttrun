const { cpSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();

const cargo = spawnSync("cargo", ["build", "--release"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (cargo.status !== 0) {
  process.exit(cargo.status ?? 1);
}

const targetDir = join(root, "target", "release");
const source = resolveArtifact(targetDir);
const indexNode = join(root, "index.node");
const tripleNode = join(root, binaryName());

cpSync(source, indexNode);
cpSync(source, tripleNode);

process.stdout.write(`Native addon copied to:\n- ${indexNode}\n- ${tripleNode}\n`);

function resolveArtifact(dir) {
  const candidates =
    process.platform === "win32"
      ? [join(dir, "tturn.dll")]
      : process.platform === "darwin"
        ? [join(dir, "libtturn.dylib")]
        : [join(dir, "libtturn.so")];

  for (const file of candidates) {
    if (existsSync(file)) {
      return file;
    }
  }

  throw new Error(`Native artifact not found under ${dir}`);
}

function binaryName() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "win32") {
    return `tturn.${platform}-${arch}-msvc.node`;
  }
  return `tturn.${platform}-${arch}.node`;
}
