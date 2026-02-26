import { createTurnCredential } from "./credentials";
import { TurnService } from "./service";
import { TurnServiceOptions } from "./types";

export * from "./types";
export { createTurnCredential, TurnService };

export class Tturn extends TurnService {}

export function createTurnService(options: TurnServiceOptions): TurnService {
  return new TurnService(options);
}
