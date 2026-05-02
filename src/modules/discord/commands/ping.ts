import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Use to see if the bot is online."),

  callback: async (interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Pong!",
    });
  },
} as Command;
