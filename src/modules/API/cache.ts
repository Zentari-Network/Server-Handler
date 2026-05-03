import type { UpdateServerStateRequest } from "./routes/server/server.types";

export default abstract class APICache {
  private static serverStates: Record<number, UpdateServerStateRequest> = {};

  public static GetServerState(
    id: number,
  ): UpdateServerStateRequest | undefined {
    return this.serverStates[id];
  }
  public static UpdateServerState(
    id: number,
    data: UpdateServerStateRequest,
  ): void {
    this.serverStates[id] = {
      players: data.players,
      tps: data.tps,
    };
  }
}
