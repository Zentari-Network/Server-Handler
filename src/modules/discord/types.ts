import type {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  callback: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (
    interaction: AutocompleteInteraction,
  ) => Promise<ApplicationCommandOptionChoiceData[]>;
}
