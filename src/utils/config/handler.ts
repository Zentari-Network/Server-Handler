import * as fs from "fs";
import Logger from "../logger";
import type { RawConfig } from "./types";

export default class ConfigHandler {
  private static instance: RawConfig;

  public constructor() {
    ConfigHandler.Refresh();
  }

  public static Refresh(): void {
    const { DISCORD_ID, DISCORD_TOKEN } = process.env;

    if (!DISCORD_ID || !DISCORD_TOKEN) {
      Logger.Fatal("Missing .env variables!");
      return;
    }

    const data = JSON.parse(
      fs.readFileSync("lib/config.json", "utf-8"),
    ) as RawConfig;

    ConfigHandler.instance = {
      ...data,
      discord_id: DISCORD_ID,
      discord_token: DISCORD_TOKEN,
    };

    Logger.Info("Refreshed config.");
  }

  public static AllowedRole(): string {
    return ConfigHandler.instance.allowed_role;
  }

  public static APIEnabled(): boolean {
    return ConfigHandler.instance.api_enabled;
  }
  public static APIPort(): number {
    return ConfigHandler.instance.api_port;
  }
  public static APISecret(): string {
    return ConfigHandler.instance.api_secret;
  }
  public static APIPortRange(): [number, number] {
    return ConfigHandler.instance.api_port_range;
  }

  public static LogUpdateSpeed(): number {
    return ConfigHandler.instance.log_update_speed;
  }

  public static DiscordID(): string {
    return ConfigHandler.instance.discord_id;
  }
  public static DiscordToken(): string {
    return ConfigHandler.instance.discord_token;
  }
}
