import { createHmac } from "node:crypto";
import { IssueCredentialOptions, TurnCredential } from "./types";

const DEFAULT_TTL_SEC = 3600;

export function createTurnCredential(authSecret: string, options: IssueCredentialOptions = {}): TurnCredential {
  const ttlSec = Math.max(60, options.ttlSec ?? DEFAULT_TTL_SEC);
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSec;
  const userPrefix = options.userId ? `${options.userId}:` : "";
  const username = `${userPrefix}${expiresAt}`;
  const password = createHmac("sha1", authSecret).update(username).digest("base64");

  return { username, password, ttlSec, expiresAt };
}
