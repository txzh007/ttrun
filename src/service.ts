import { binding } from "./native-binding";
import { IceServer, IssueCredentialOptions, StartOptions, TurnServiceOptions } from "./types";

export class TurnService {
  private readonly native: InstanceType<typeof binding.NativeTurnService>;
  private readonly defaultIssueOptions: IssueCredentialOptions;

  constructor(options: TurnServiceOptions) {
    const { username, password, userId, ttlSec, ...nativeOptions } = options;
    const disableCredentialExpiry = options.disableCredentialExpiry ?? true;

    this.native = new binding.NativeTurnService({
      ...nativeOptions,
      authSecret: nativeOptions.authSecret ?? "",
      listenPort: nativeOptions.listenPort ?? 3478,
      minPort: nativeOptions.minPort ?? 49152,
      maxPort: nativeOptions.maxPort ?? 65535,
      publicIp: nativeOptions.publicIp ?? nativeOptions.realm,
      listeningIp: nativeOptions.listeningIp ?? "0.0.0.0",
      username,
      password,
      disableCredentialExpiry
    });

    this.defaultIssueOptions = {
      ttlSec,
      username,
      userId
    };
  }

  async start(startOptions: StartOptions = {}): Promise<IceServer> {
    this.native.start(Boolean(startOptions.detached));
    return this.issueCredential();
  }

  async stop(): Promise<void> {
    this.native.stop();
  }

  issueCredential(issueOptions: IssueCredentialOptions = {}): IceServer {
    const merged = { ...this.defaultIssueOptions, ...issueOptions };
    const out = this.native.issueCredential(merged.ttlSec, merged.userId, merged.username);
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
