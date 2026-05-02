import type { ApplicationCommandOptionChoiceData } from "discord.js";
import DatabaseHandler from "../../../utils/database/handler";
import { type Server } from "../../../utils/database/types";

export default async function ServerCompletion(): Promise<
  ApplicationCommandOptionChoiceData[]
> {
  const servers = DatabaseHandler.GetInstance()
    .query("SELECT * FROM servers")
    .all() as Server[];

  return servers.map((entry) => {
    return {
      name: entry.name
        .split(" ")
        .map((word) => word[0]!.toUpperCase() + word.slice(1))
        .join(" "),
      value: entry.name,
    };
  });
}
