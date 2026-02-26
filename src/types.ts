export interface TurnCredential {
  username: string;
  password: string;
  ttlSec: number;
  expiresAt: number;
}

export interface IceServer {
  urls: string[];
  username: string;
  credential: string;
}

export interface IssueCredentialOptions {
  ttlSec?: number;
  userId?: string;
}

export interface TurnServiceOptions {
  realm: string;
  authSecret: string;
  listenPort?: number;
  minPort?: number;
  maxPort?: number;
  publicIp?: string;
  listeningIp?: string;
}

export interface StartOptions {
  detached?: boolean;
}
