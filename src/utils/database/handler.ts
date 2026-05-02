import { Database } from "bun:sqlite";
import * as fs from "fs";
import Logger from "../logger";
import DatabaseConstants from "./constants";

export default class DatabaseHandler {
  private static instance?: Database;

  public constructor() {
    this.Init();
  }

  public static GetInstance(): Database {
    return DatabaseHandler.instance!;
  }

  private Init(): void {
    if (!fs.existsSync("data")) {
      fs.mkdirSync("data");
    }
    if (!fs.existsSync("data/servers")) {
      fs.mkdirSync("data/servers");
    }

    DatabaseHandler.instance = new Database(`data/database.db`);
    DatabaseHandler.instance.run("PRAGMA foreign_keys = ON");

    for (const table of DatabaseConstants.Tables) {
      DatabaseHandler.instance.run(
        `CREATE TABLE IF NOT EXISTS ${table.name} (${table.columns.join(", ")})`,
      );
    }

    Logger.Notice("Database initialized!");
  }
}
