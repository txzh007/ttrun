import { createHmac } from "node:crypto";
import { IssueCredentialOptions, TurnCredential } from "./types";

const DEFAULT_TTL_SEC = 3600;

export function createTurnCredential(authSecret: string, options: IssueCredentialOptions = {}): TurnCredential {
  const ttlSec = Math.max(60, options.ttlSec ?? DEFAULT_TTL_SEC);
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSec;
  const username = resolveUsername(options, expiresAt);
  const password = createHmac("sha1", authSecret).update(username).digest("base64");

  return { username, password, ttlSec, expiresAt };
}

function resolveUsername(options: IssueCredentialOptions, expiresAt: number): string {
  if (options.username) {
    const tail = options.username.split(":").pop();
    if (tail && /^\d+$/.test(tail) && Number(tail) > Math.floor(Date.now() / 1000)) {
      return options.username;
    }
    return `${options.username}:${expiresAt}`;
  }

  const userPrefix = options.userId ? `${options.userId}:` : "";
  return `${userPrefix}${expiresAt}`;
}
