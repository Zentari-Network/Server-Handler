import ConfigHandler from "./config/handler";
import DatabaseHandler from "./database/handler";
import type { Server } from "./database/types";

export default abstract class Network {
  public static GetRandomPort(): number | undefined {
    const usedPorts = new Set(
      (
        DatabaseHandler.GetInstance()
          .query("SELECT port FROM servers")
          .all() as Server[]
      ).map((server) => server.port),
    );
    const [min, max] = ConfigHandler.APIPortRange();
    const available: number[] = [];

    for (let port = min; port <= max; port++) {
      if (!usedPorts.has(port)) {
        available.push(port);
      }
    }

    if (available.length === 0) {
      return undefined;
    }

    return available[Math.floor(Math.random() * available.length)];
  }
}
