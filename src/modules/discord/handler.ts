import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
  Events,
  GuildMember,
  IntentsBitField,
  MessageFlags,
  REST,
  Routes,
} from "discord.js";
import * as fs from "fs";
import ConfigHandler from "../../utils/config/handler";
import Logger from "../../utils/logger";
import type { Command } from "./types";

export default class DiscordHandler {
  private static client: Client;
  private static commands: Command[] = [];
  private static online = false;

  public constructor() {
    this.Init();
  }

  private async Init(): Promise<void> {
    this.LoadCommands();
    await this.DeployCommands();
    this.Start();
  }

  private Start(): void {
    DiscordHandler.client = new Client({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
      ],
    });

    this.Events();

    DiscordHandler.client.login(ConfigHandler.DiscordToken());
  }

  private Events(): void {
    DiscordHandler.client.once(Events.ClientReady, () => {
      DiscordHandler.online = true;

      Logger.Notice(
        `Discord client is online, and logged in as`,
        DiscordHandler.client.user!.tag,
      );
    });
    DiscordHandler.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        this.OnCommand(interaction);
        return;
      }
      if (interaction.isAutocomplete()) {
        this.OnCompletion(interaction);
        return;
      }
    });
  }

  private async OnCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (!interaction.guild) {
      await interaction.deferReply();

      interaction.editReply({
        content: "You may only use my commands in a guild!",
      });
      return;
    }

    const member = interaction.member as GuildMember;

    if (!member.roles.cache.has(ConfigHandler.AllowedRole())) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      interaction.editReply({
        content: "You do not have the permission to use my commands!",
      });
      return;
    }

    const command = DiscordHandler.commands.find(
      (command) => command.data.name === interaction.commandName,
    );

    if (!command) {
      return;
    }

    Logger.Info(`${member.user.username} used command ${command.data.name}`);

    try {
      await command.callback(interaction);
    } catch (error) {
      Logger.Warn(`Failed to execute command ${command.data.name}:`, error);

      if (!interaction.deferred) {
        await interaction.deferReply();
      }

      interaction.editReply({
        content:
          "Something went wrong while executing this command, please contact a higher up to get this fixed!",
      });
    }
  }
  private async OnCompletion(
    interaction: AutocompleteInteraction,
  ): Promise<void> {
    const command = DiscordHandler.commands.find(
      (command) => command.data.name === interaction.commandName,
    );

    if (!command) {
      return;
    }
    if (!command.autocomplete) {
      return;
    }

    interaction.respond(await command.autocomplete(interaction));
  }

  private LoadCommands(): void {
    Logger.Info("Loading commands...");

    const files = fs.readdirSync(`${__dirname}/commands`);
    let loaded = 0;

    for (const file of files) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const command = require(`${__dirname}/commands/${file}`)
          .default as Command;

        if (!command.callback || !command.data) {
          Logger.Warn(
            `Missing command callback or data for command file:`,
            file,
          );
          continue;
        }

        DiscordHandler.commands.push(command);

        loaded++;
      } catch (error) {
        Logger.Warn(`Failed to load command file:`, file);
        console.error(error);
      }
    }

    Logger.Notice(`Loaded (${loaded}/${files.length}) commands!`);
  }
  private async DeployCommands(): Promise<void> {
    const rest = new REST({ version: "10" });

    rest.setToken(ConfigHandler.DiscordToken());

    Logger.Info("Deploying commands...");

    try {
      await rest.put(Routes.applicationCommands(ConfigHandler.DiscordID()), {
        body: DiscordHandler.commands.map((command) => command.data.toJSON()),
      });

      Logger.Notice(
        `Successfully deployed ${DiscordHandler.commands.length} commands!`,
      );
    } catch {
      Logger.Fatal("Failed to deploy commands!");
    }
  }

  public static IsOnline(): boolean {
    return DiscordHandler.online;
  }

  public static async Close(): Promise<void> {
    Logger.Info("Closing Discord client...");

    await DiscordHandler.client.destroy();

    Logger.Notice("Discord client closed!");
  }
}
