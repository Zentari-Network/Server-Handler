import { sleep } from "bun";
import * as fs from "fs";
import path from "path";
import DatabaseHandler from "../../utils/database/handler";
import type { Server } from "../../utils/database/types";
import Logger from "../../utils/logger";
import DockerHandler from "../docker/handler";
import type { RestartCountdown } from "./types";

export default class RestartHandler {
  public constructor() {
    this.RestartLoop();
  }

  private RestartLoop(): void {
    Logger.Info("Restart handler running...");

    setInterval(() => {
      const current = new Date();
      const currentHours = current.getHours().toString().padStart(2, "0");
      const currentMinutes = current.getMinutes().toString().padStart(2, "0");
      const servers = DatabaseHandler.GetInstance()
        .query("SELECT * FROM servers")
        .all() as Server[];

      servers.forEach(async (server) => {
        if (server.restart_times.length === 0) {
          return;
        }

        for (const time of JSON.parse(server.restart_times) as string[]) {
          const [hours, minutes] = time.split(":");

          if (
            hours !== currentHours ||
            minutes !== currentMinutes ||
            !(await DockerHandler.IsOnline(server.id))
          ) {
            continue;
          }

          this.RestartServer(server);
          return;
        }
      });
    }, 1000 * 60);
  }

  private async RestartServer(server: Server): Promise<void> {
    Logger.Notice(`Triggering auto reboot for ${server.name}...`);

    const filePath = path.join(
      process.cwd(),
      "data/servers/",
      server.name,
      "restart_countdown.json",
    );

    if (!fs.existsSync(filePath)) {
      Logger.Warn(
        `Could not find restart_countdown.json file for ${server.name}!`,
      );
      return;
    }

    const file = fs.readFileSync(filePath, "utf8");

    try {
      const restartCountdown = JSON.parse(file) as RestartCountdown[];

      for (const entry of restartCountdown) {
        for (const command of entry.commands) {
          await DockerHandler.ExecuteCommand(server.id, command);
        }

        await sleep(entry.delay * 1000);
      }

      await DockerHandler.StopServer(server.id);

      const loop = setInterval(async () => {
        if (await DockerHandler.IsOnline(server.id)) {
          return;
        }

        clearInterval(loop);
        DockerHandler.StartServer(server.id);
      }, 1000);
    } catch {
      Logger.Warn(
        `Failed to parse restart_countdown.json file for ${server.name}!`,
      );
    }
  }
}
