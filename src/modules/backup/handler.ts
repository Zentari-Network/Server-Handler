import { exec } from "child_process";
import * as fs from "fs";
import process from "process";
import { setInterval } from "timers";
import DatabaseHandler from "../../utils/database/handler";
import type {
  Backup,
  BackupWithSize,
  Server,
} from "../../utils/database/types";
import Logger from "../../utils/logger";
import Size from "../../utils/size";
import DockerHandler from "../docker/handler";

export default class BackupHandler {
  private clock = 0;

  public constructor() {
    this.Init();
  }

  private Init(): void {
    setInterval(() => {
      this.clock++;

      const servers = DatabaseHandler.GetInstance()
        .query("SELECT * FROM servers")
        .all() as Server[];

      servers.forEach((server) => {
        if (!server.backup_speed) {
          return;
        }
        if (this.clock % server.backup_speed !== 0) {
          return;
        }

        BackupHandler.CreateBackup(server);
      });
    }, 1000 * 60);
  }

  public static async CreateBackup(
    server: Server,
    name?: string,
    protect?: boolean,
  ): Promise<boolean> {
    Logger.Info(`Creating backup for server ${server.name}...`);

    const { lastInsertRowid: id } = DatabaseHandler.GetInstance()
      .query(
        "INSERT INTO backups (server_id, name, protected) VALUES (?, ?, ?)",
      )
      .run(server.id, name ?? null, protect ?? false);
    const serverDir = `${process.cwd()}/data/servers/${server.name}`;
    const proc = exec(
      `tar -czf ${serverDir}/backups/${id}.tar.gz --warning=no-file-changed -C ${serverDir} data`,
    );

    return new Promise<boolean>((resolve) => {
      proc.once("exit", (code) => {
        if (code === 0 || code === 1) {
          Logger.Notice(`Backup for ${server.name} created successfully!`);

          this.RetentionRun(server);
          resolve(true);
          return;
        }

        Logger.Warn(`Failed to create backup for ${server.name}!`);

        DatabaseHandler.GetInstance().run("DELETE FROM backups WHERE id = ?", [
          id,
        ]);

        if (fs.existsSync(`${serverDir}/backups/${id}.tar.gz`)) {
          fs.rmSync(`${serverDir}/backups/${id}.tar.gz`);
        }

        resolve(false);
      });
    });
  }
  public static GetBackups(server: Server): BackupWithSize[] {
    const backups = DatabaseHandler.GetInstance()
      .query("SELECT * FROM backups WHERE server_id = ?")
      .all(server.id) as Backup[];

    return backups.map((entry) => {
      const size = Size.GetSize(
        `${process.cwd()}/data/servers/${server.name}/backups/${entry.id}.tar.gz`,
      );

      return {
        ...entry,
        size,
      };
    });
  }
  public static async RestoreBackup(backup: Backup): Promise<boolean> {
    const server = DatabaseHandler.GetInstance()
      .query("SELECT * FROM servers WHERE id = ?")
      .get(backup.server_id) as Server;

    if (!server) {
      return false;
    }
    if (await DockerHandler.IsOnline(server.id)) {
      return false;
    }

    Logger.Info(`Restoring backup for server ${server.name}...`);

    const serverDir = `${process.cwd()}/data/servers/${server.name}`;
    const proc = exec(
      `rm -rf ${serverDir}/data/ && tar -xf ${serverDir}/backups/${backup.id}.tar.gz -C ${serverDir}`,
    );

    return new Promise<boolean>((resolve) => {
      proc.once("exit", (code) => {
        if (code === 0) {
          Logger.Notice(`Backup for ${server.name} restored successfully!`);

          resolve(true);
          return;
        }

        Logger.Warn(`Failed to restore backup for ${server.name}!`);
        resolve(false);
      });
    });
  }

  private static RetentionRun(server: Server): void {
    const backups = (
      DatabaseHandler.GetInstance()
        .query("SELECT * FROM backups WHERE server_id = ?")
        .all(server.id) as Backup[]
    )
      .filter((entry) => !entry.protected)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

    if (backups.length < server.backup_retention) {
      return;
    }

    const leftovers = backups.slice(server.backup_retention);

    if (leftovers.length === 0) {
      return;
    }

    for (const entry of leftovers) {
      fs.rmSync(
        `${process.cwd()}/data/servers/${server.name}/backups/${entry.id}.tar.gz`,
      );
    }

    const placeholders = leftovers.map(() => "?").join(", ");

    DatabaseHandler.GetInstance().run(
      `DELETE FROM backups WHERE id IN (${placeholders})`,
      leftovers.map((entry) => entry.id),
    );

    Logger.Notice(
      `Deleted ${leftovers.length} leftover backups for server ${server.name}!`,
    );
  }
}
