import { type Request, type Response } from "express";
import * as fs from "fs";
import DatabaseHandler from "../../../../utils/database/handler";
import type { Server } from "../../../../utils/database/types";
import Network from "../../../../utils/network";
import DockerHandler from "../../../docker/handler";
import APICache from "../../cache";
import type {
  CreateServerRequest,
  ServerState,
  UpdateServerStateRequest,
} from "./server.types";

export default abstract class ServerController {
  public static async UpdateServerState(
    req: Request,
    res: Response,
  ): Promise<void> {
    const id = parseInt(req.params.id as string);
    const { players, tps }: UpdateServerStateRequest = req.body;

    if (isNaN(id)) {
      res.status(400).json({
        error: "Invalid server ID!",
      });
      return;
    }
    if (!Array.isArray(players) || isNaN(tps)) {
      res.status(400).json({
        error: "Invalid server state!",
      });
      return;
    }

    const server = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers WHERE id = ?")
      .get(id) as Server;

    if (!server) {
      res.status(404).json({
        error: "Server not found!",
      });
      return;
    }

    APICache.UpdateServerState(id, { players, tps });

    res.json({
      message: "Server state updated successfully!",
    });
  }
  public static async CreateServer(req: Request, res: Response): Promise<void> {
    const { name, autostart }: CreateServerRequest = req.body;
    let { port, template, cpu_limit, ram_limit }: CreateServerRequest =
      req.body;

    if (cpu_limit) {
      cpu_limit = parseFloat(cpu_limit.toFixed(2));
    }
    if (ram_limit) {
      ram_limit = Math.floor(ram_limit);
    }
    if (!name || name.includes(" ")) {
      res.status(400).json({
        error: "Invalid server name!",
      });
      return;
    }
    if (!port) {
      port = Network.GetRandomPort();
    }
    if (!template) {
      template = "default";
    }
    if (!fs.existsSync(`lib/templates/${template}`)) {
      res.status(400).json({
        error: "Invalid template!",
      });
      return;
    }
    if (!port) {
      res.status(500).json({
        error: "Could not get random port!",
      });
      return;
    }

    const takenNames = DatabaseHandler.GetInstance()
      .query("SELECT name FROM servers")
      .all() as Server[];

    if (takenNames.some((entry) => entry.name === name)) {
      res.status(409).json({
        error: "Server name already taken!",
      });
      return;
    }
    if (fs.existsSync(`data/servers/${name}`)) {
      res.status(409).json({
        error: "Server folder already exists!",
      });
      return;
    }

    fs.mkdirSync(`data/servers/${name}`);
    fs.mkdirSync(`data/servers/${name}/backups`);
    fs.cpSync(
      `lib/templates/${template}/restart_countdown.json`,
      `data/servers/${name}/restart_countdown.json`,
    );
    fs.cpSync(`lib/templates/${template}/data`, `data/servers/${name}/data`, {
      recursive: true,
    });

    const id = DatabaseHandler.GetInstance().run(
      "INSERT INTO servers (name, port, cpu_limit, ram_limit) VALUES (?, ?, ?, ?)",
      [name, port, cpu_limit ?? null, ram_limit ?? null],
    ).lastInsertRowid;

    if (autostart) {
      await DockerHandler.StartServer(id as number);
    }

    res.json({
      id,
      port,
    });
  }
  public static async DeleteServer(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      res.status(400).json({
        error: "Invalid server ID!",
      });
      return;
    }

    const server = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers WHERE id = ?")
      .get(id) as Server;

    if (!server) {
      res.status(404).json({
        error: "Server not found!",
      });
      return;
    }
    if (await DockerHandler.IsOnline(id)) {
      await DockerHandler.StopServer(id);
    }

    DatabaseHandler.GetInstance().run("DELETE FROM servers WHERE id = ?", [id]);

    fs.rmSync(`data/servers/${server.name}`, { recursive: true });

    res.json({
      message: "Server deleted successfully!",
    });
  }
  public static async StartServer(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      res.status(400).json({
        error: "Invalid server ID!",
      });
      return;
    }

    const server = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers WHERE id = ?")
      .get(id) as Server;

    if (!server) {
      res.status(404).json({
        error: "Server not found!",
      });
      return;
    }
    if (await DockerHandler.IsOnline(id)) {
      res.status(409).json({
        error: "Server is already online!",
      });
      return;
    }

    await DockerHandler.StartServer(id);

    res.json({
      message: "Server started successfully!",
    });
  }
  public static async StopServer(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      res.status(400).json({
        error: "Invalid server ID!",
      });
      return;
    }

    const server = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers WHERE id = ?")
      .get(id) as Server;

    if (!server) {
      res.status(404).json({
        error: "Server not found!",
      });
      return;
    }
    if (!(await DockerHandler.IsOnline(id))) {
      res.status(409).json({
        error: "Server is already offline!",
      });
      return;
    }

    await DockerHandler.StopServer(id);

    res.json({
      message: "Server stopped successfully!",
    });
  }
  public static async RestartServer(
    req: Request,
    res: Response,
  ): Promise<void> {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      res.status(400).json({
        error: "Invalid server ID!",
      });
      return;
    }

    const server = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers WHERE id = ?")
      .get(id) as Server;

    if (!server) {
      res.status(404).json({
        error: "Server not found!",
      });
      return;
    }
    if (await DockerHandler.IsOnline(id)) {
      DockerHandler.StopServer(id);

      await new Promise<void>((resolve) => {
        const loop = setInterval(async () => {
          if (await DockerHandler.IsOnline(id)) {
            return;
          }

          clearInterval(loop);
          resolve();
        }, 1000);
      });
    }

    await DockerHandler.StartServer(id);

    res.json({
      message: "Server restarted successfully!",
    });
  }

  public static async GetSelf(req: Request, res: Response): Promise<void> {
    const ip = req.ip!.split(":").pop();
    const record = await DockerHandler.GetAllContainersIPs();
    const id = Object.entries(record).find((entry) => entry[1] === ip)?.[0];

    if (!id) {
      res.status(404).json({
        error: "Could not find server ID based off your IP!",
      });
      return;
    }

    const server = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers WHERE id = ?")
      .get(id) as Server;

    if (!server) {
      res.status(404).json({
        error: "Server not found!",
      });
      return;
    }

    res.json(server);
  }
  public static async GetServers(req: Request, res: Response): Promise<void> {
    const servers = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers")
      .all() as Server[];

    res.json(servers);
  }
  public static async GetServer(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      res.status(400).json({
        error: "Invalid server ID!",
      });
      return;
    }

    const server = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers WHERE id = ?")
      .get(id) as Server;

    if (!server) {
      res.status(404).json({
        error: "Server not found!",
      });
      return;
    }

    res.json(server);
  }
  public static async GetServerStates(
    req: Request,
    res: Response,
  ): Promise<void> {
    const servers = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers")
      .all() as Server[];
    const states = await Promise.all<ServerState>(
      servers.map(async (server): Promise<ServerState> => {
        const isOnline = await DockerHandler.IsOnline(server.id);

        if (!isOnline) {
          return {
            id: server.id,
            online: false,
          };
        }

        const stats = await DockerHandler.GetStats(server.id);

        if (!stats) {
          return {
            id: server.id,
            online: false,
          };
        }

        const state = APICache.GetServerState(server.id);

        return {
          id: server.id,
          online: true,
          tps: state?.tps ?? 0,
          cpu: stats.cpu,
          memory: stats.memory,
          players: state?.players ?? [],
          uptime: stats.uptime,
        };
      }),
    );

    res.json(states);
  }
  public static async GetServerState(
    req: Request,
    res: Response,
  ): Promise<void> {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      res.status(400).json({
        error: "Invalid server ID!",
      });
      return;
    }

    const server = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers WHERE id = ?")
      .get(id) as Server;

    if (!server) {
      res.status(404).json({
        error: "Server not found!",
      });
      return;
    }

    const isOnline = await DockerHandler.IsOnline(server.id);

    if (!isOnline) {
      res.json({
        id: server.id,
        online: false,
      });
      return;
    }

    const stats = await DockerHandler.GetStats(server.id);

    if (!stats) {
      res.json({
        id: server.id,
        online: false,
      });
      return;
    }

    const state = APICache.GetServerState(server.id);

    res.json({
      id: server.id,
      online: true,
      tps: state?.tps ?? 0,
      cpu: stats.cpu,
      memory: stats.memory,
      players: state?.players ?? [],
      uptime: stats.uptime,
    });
  }
}
