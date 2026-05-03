import { spawn } from "child_process";
import * as fs from "fs";
import path from "path";
import ConfigHandler from "../../utils/config/handler";
import DatabaseHandler from "../../utils/database/handler";
import type { Server } from "../../utils/database/types";
import Logger from "../../utils/logger";
import type { ContainerStats } from "./types";

export default class DockerHandler {
  private static ready = false;

  public constructor() {
    this.BuildImage();

    this.LogLoop();
  }

  public static async StartServer(id: number): Promise<boolean> {
    const server = (await DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers WHERE id = ?")
      .all(id)[0]) as Server;

    if (!server) {
      return false;
    }
    if (await DockerHandler.IsOnline(id)) {
      return false;
    }

    Logger.Info(`Starting server ${server.name}...`);

    const dataPath = path.join(
      process.cwd(),
      "data",
      "servers",
      server.name,
      "data",
    );
    const args = [
      "run",
      "-d",
      "--rm",
      "--name",
      `server_${id}`,
      "-p",
      `${server.port}:19132/udp`,
      "-v",
      `${path.join(dataPath, "config")}:/app/config:rw`,
      "-v",
      `${path.join(dataPath, "development_behavior_packs")}:/app/development_behavior_packs:rw`,
      "-v",
      `${path.join(dataPath, "development_resource_packs")}:/app/development_resource_packs:rw`,
      "-v",
      `${path.join(dataPath, "worlds")}:/app/worlds:rw`,
      "-v",
      `${path.join(dataPath, "allowlist.json")}:/app/allowlist.json:rw`,
      "-v",
      `${path.join(dataPath, "permissions.json")}:/app/permissions.json:rw`,
      "-v",
      `${path.join(dataPath, "server.properties")}:/app/server.properties:rw`,
      "server:latest",
    ];
    const proc = spawn("docker", args, {
      stdio: "ignore",
    });

    return new Promise<boolean>((resolve) => {
      proc.once("exit", (code) => {
        if (code !== 0) {
          Logger.Warn(`Failed to start server ${server.name}!`);
          resolve(false);
        } else {
          Logger.Notice(`Server ${server.name} started successfully!`);
          resolve(true);
        }
      });
    });
  }
  public static async StopServer(id: number): Promise<boolean> {
    const servers = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers")
      .all() as Server[];
    const server = servers.find((entry) => entry.id === id);

    if (!server) {
      return false;
    }

    Logger.Info(`Stopping server ${server.name}...`);

    const request = await DockerHandler.ExecuteCommand(id, "stop");

    if (!request) {
      Logger.Warn(`Failed to stop server ${server.name}!`);
      return false;
    } else {
      Logger.Notice(`Server ${server.name} stopped successfully!`);
      return true;
    }
  }
  public static async ExecuteCommand(
    id: number,
    command: string,
  ): Promise<boolean> {
    if (!(await this.IsOnline(id))) {
      return false;
    }

    const process = spawn(
      "docker",
      ["exec", `server_${id}`, "sh", "-c", `echo '${command}' >> /tmp/cmd`],
      {
        stdio: "ignore",
      },
    );

    return new Promise<boolean>((resolve) => {
      process.once("exit", (code) => {
        resolve(code === 0);
      });
    });
  }

  public static async IsReady(): Promise<void> {
    if (DockerHandler.ready) {
      return;
    }

    return new Promise((resolve) => {
      const loop = setInterval(() => {
        if (!DockerHandler.ready) {
          return;
        }

        clearInterval(loop);
        resolve();
      }, 500);
    });
  }
  public static async IsOnline(id: number): Promise<boolean> {
    const process = spawn(
      "docker",
      `container inspect server_${id}`.split(" "),
      {
        stdio: "ignore",
      },
    );

    return new Promise<boolean>((resolve) => {
      process.once("exit", (code) => {
        resolve(code === 0);
      });
    });
  }

  public static async GetStats(
    id: number,
  ): Promise<ContainerStats | undefined> {
    if (!(await DockerHandler.IsOnline(id))) {
      return;
    }

    const spawnStdout = (args: string[]): Promise<string | undefined> =>
      new Promise((resolve) => {
        const proc = spawn("docker", args);
        let output = "";
        proc.stdout?.on("data", (data) => (output += data.toString()));
        proc.once("exit", (code) => {
          if (code !== 0) {
            Logger.Warn(`Failed to get stats for server ${id}!`);
            resolve(undefined);
          } else {
            resolve(output.trim());
          }
        });
      });

    const [stats, ps] = await Promise.all([
      spawnStdout([
        "stats",
        `server_${id}`,
        "--no-stream",
        "--format",
        "{{.CPUPerc}},{{.MemUsage}}",
      ]),
      spawnStdout([
        "ps",
        "--filter",
        `name=server_${id}`,
        "--format",
        "{{.Status}}",
      ]),
    ]);

    if (!stats || !ps) return undefined;

    const [rawCPU, rawMemory] = stats.split(",");
    const cpu = parseFloat(rawCPU!.replace("%", ""));
    const uptime = ps.trim();
    const rawMem = rawMemory!.split("/")[0]!.trim(); // e.g. "512MiB" or "1.2GiB"
    const memValue = parseFloat(rawMem);
    const memUnit = rawMem.replace(/[\d.]/g, "").trim().toUpperCase();
    const memMultiplier: Record<string, number> = {
      B: 1,
      KIB: 1024,
      MIB: 1024 ** 2,
      GIB: 1024 ** 3,
    };
    const memory = memValue * (memMultiplier[memUnit] ?? 1024 ** 2);

    return { cpu, memory, uptime };
  }

  private async BuildImage(): Promise<void> {
    Logger.Info("Building Docker image, this may take a while...");

    const args = `build --build-arg INSTALL_LINK=${await ConfigHandler.ServerInstallLink()} -t server:latest .`;
    const process = spawn("docker", args.split(" "), {
      stdio: "ignore",
      cwd: "images/server",
    });

    return new Promise((resolve) => {
      process.once("exit", (code) => {
        if (code !== 0) {
          Logger.Fatal("Failed to build Docker image!");
          resolve();
        } else {
          Logger.Notice("Docker image built successfully!");

          DockerHandler.ready = true;
          resolve();
        }
      });
    });
  }

  private async LogLoop(): Promise<void> {
    setInterval(() => {
      if (!DatabaseHandler.GetInstance()) {
        return;
      }

      const servers = DatabaseHandler.GetInstance()
        .query("SELECT * FROM servers")
        .all() as Server[];

      servers.forEach(async (server) => {
        if (!(await DockerHandler.IsOnline(server.id))) {
          fs.writeFileSync(
            `data/servers/${server.name}/console.log`,
            "SERVER OFFLINE!",
          );
          return;
        }

        const logs: string[] = [];
        const process = spawn("docker", [
          "logs",
          "--tail",
          "1000",
          `server_${server.id}`,
        ]);

        process.stdout?.on("data", (data: Buffer) => {
          logs.push(data.toString());
        });
        process.stderr?.on("data", (data: Buffer) => {
          logs.push(data.toString());
        });
        process.once("exit", (code) => {
          if (code !== 0) {
            Logger.Warn(
              `Failed to get logs for ${server.name}! | Code: ${code}`,
            );
            return;
          }

          fs.writeFileSync(
            `data/servers/${server.name}/console.log`,
            logs.join(""),
          );
        });
      });
    }, 1000 * ConfigHandler.LogUpdateSpeed());
  }
}
