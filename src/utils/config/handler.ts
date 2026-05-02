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
  public static LogUpdateSpeed(): number {
    return ConfigHandler.instance.log_update_speed;
  }

  public static DiscordID(): string {
    return ConfigHandler.instance.discord_id;
  }
  public static DiscordToken(): string {
    return ConfigHandler.instance.discord_token;
  }

  public static async ServerInstallLink(): Promise<string> {
    const res = await fetch(
      "https://minecraft.wiki/w/Bedrock_Dedicated_Server",
      {
        headers: { "User-Agent": "mcbe-server-manager/1.0" },
      },
    );
    const text = await res.text();
    const matches = [
      ...text.matchAll(
        /bin-linux\/bedrock-server-([\d]+\.[\d]+\.[\d]+\.[\d]+)\.zip/g,
      ),
    ];

    if (!matches.length) {
      Logger.Fatal("Could not find latest bedrock software version!");
    }

    const versions = matches.map((m) => m[1]);

    versions.sort((a, b) => {
      const ap = a!.split(".").map(Number);
      const bp = b!.split(".").map(Number);

      for (let i = 0; i < 4; i++) {
        if (ap[i] !== bp[i]) return ap[i]! - bp[i]!;
      }

      return 0;
    });

    const latest = versions[versions.length - 1];

    return `https://www.minecraft.net/bedrockdedicatedserver/bin-linux/bedrock-server-${latest}.zip`;
  }
}
