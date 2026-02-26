import { binding } from "./native-binding";
import { IceServer, IssueCredentialOptions, StartOptions, TurnServiceOptions } from "./types";

export class TurnService {
  private readonly native: InstanceType<typeof binding.NativeTurnService>;

  constructor(options: TurnServiceOptions) {
    this.native = new binding.NativeTurnService({
      ...options,
      listenPort: options.listenPort ?? 3478,
      minPort: options.minPort ?? 49152,
      maxPort: options.maxPort ?? 65535,
      publicIp: options.publicIp ?? options.realm,
      listeningIp: options.listeningIp ?? "0.0.0.0"
    });
  }

  async start(startOptions: StartOptions = {}): Promise<void> {
    this.native.start(Boolean(startOptions.detached));
  }

  async stop(): Promise<void> {
    this.native.stop();
  }

  issueCredential(issueOptions: IssueCredentialOptions = {}): IceServer {
    const out = this.native.issueCredential(issueOptions.ttlSec, issueOptions.userId);
    return {
      urls: this.native.getIceUrls(),
      username: out.username,
      credential: out.password
    };
  }

  getIceUrls(): string[] {
    return this.native.getIceUrls();
  }

  health(): { running: boolean } {
    return this.native.health();
  }
}
