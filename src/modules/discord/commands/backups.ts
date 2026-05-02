import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import DatabaseHandler from "../../../utils/database/handler";
import type { Server } from "../../../utils/database/types";
import Size from "../../../utils/size";
import BackupHandler from "../../backup/handler";
import DockerHandler from "../../docker/handler";
import ServerCompletion from "../completion/server";
import type { Command } from "../types";

export default {
  autocomplete: ServerCompletion,
  data: new SlashCommandBuilder()
    .setName("backups")
    .setDescription("Manage your backups for servers.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a backup for a server.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name of the server.")
            .setAutocomplete(true)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("backup_name")
            .setDescription("The name of the backup."),
        )
        .addBooleanOption((option) =>
          option
            .setName("protected")
            .setDescription(
              "Whether the backup can be deleted when too old by retention policy.",
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all backups for a server.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name of the server.")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("restore")
        .setDescription(
          "Restore a backup on the server. WILL DELETE ALL CURRENT DATA ON THE SERVER!",
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name of the server.")
            .setAutocomplete(true)
            .setRequired(true),
        )
        .addNumberOption((option) =>
          option
            .setName("id")
            .setDescription("The ID of the backup to restore.")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("update")
        .setDescription("Update a backup's information.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name of the server.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addNumberOption((option) =>
          option
            .setName("id")
            .setDescription("The ID of the backup.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("backup_name")
            .setDescription("The new name of the backup."),
        )
        .addBooleanOption((option) =>
          option
            .setName("backup_protected")
            .setDescription(
              "Whether the backup can be deleted when too old by retention policy.",
            ),
        ),
    ),
  async callback(interaction) {
    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case "create":
        createBackup(interaction);
        break;

      case "list":
        listBackups(interaction);
        break;

      case "restore":
        restoreBackup(interaction);
        break;

      case "update":
        updateBackup(interaction);
        break;
    }
  },
} as Command;

async function updateBackup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("name", true);
  const id = interaction.options.getNumber("id", true);
  const backupName = interaction.options.getString("backup_name");
  const backupProtected = interaction.options.getBoolean("backup_protected");

  const server = DatabaseHandler.GetInstance()
    .query("SELECT * FROM servers WHERE name = ?")
    .get(name) as Server;

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Server not found!",
    });
    return;
  }

  const backup = BackupHandler.GetBackups(server).find(
    (backup) => backup.id === id,
  );

  if (!backup) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Backup not found!",
    });
    return;
  }

  await interaction.deferReply();

  DatabaseHandler.GetInstance().run(
    "UPDATE backups SET name = ?, protected = ? WHERE id = ?",
    [backupName, backupProtected ?? false, id],
  );

  interaction.editReply({
    content: "Backup updated successfully!",
  });
}

async function restoreBackup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("name", true);
  const id = interaction.options.getNumber("id", true);
  const server = DatabaseHandler.GetInstance()
    .query("SELECT * FROM servers WHERE name = ?")
    .get(name) as Server;

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Server not found!",
    });
    return;
  }
  if (await DockerHandler.IsOnline(server.id)) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Server must be offline to restore a backup!",
    });
    return;
  }

  const backup = BackupHandler.GetBackups(server).find(
    (backup) => backup.id === id,
  );

  if (!backup) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Backup not found!",
    });
    return;
  }

  await interaction.deferReply();

  interaction.editReply({
    content: "Restoring backup...",
  });

  const request = await BackupHandler.RestoreBackup(backup);

  if (!request) {
    interaction.editReply({
      content: "Failed to restore backup!",
    });
    return;
  }

  interaction.editReply({
    content: `Successfully restored backup!`,
  });
}

async function listBackups(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("name", true);
  const server = DatabaseHandler.GetInstance()
    .query("SELECT * FROM servers WHERE name = ?")
    .get(name) as Server;

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Server not found!",
    });
    return;
  }

  await interaction.deferReply();

  const backups = BackupHandler.GetBackups(server).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (backups.length === 0) {
    interaction.editReply({
      content: "No backups found for this server!",
    });
    return;
  }

  const protectedBackups = backups.filter((backup) => backup.protected);
  const unprotectedBackups = backups.filter((backup) => !backup.protected);

  interaction.editReply({
    content: [
      `# 🗄️ ${server.name} Backups`,
      `📦 **${backups.length} total** • 🔒 **${protectedBackups.length} protected** • 🔓 **${unprotectedBackups.length} unprotected**`,

      `\n## 🔒 Protected Backups`,
      ...protectedBackups.map((backup, index) =>
        [
          `### \`[${index + 1}]\` ${backup.name ?? "Unnamed"}`,
          `🆔 \`${backup.id}\``,
          `📅 <t:${Math.floor(new Date(backup.created_at).getTime() / 1000)}:R>`,
          `💾 \`${Size.FormatSize(backup.size)}\``,
        ].join("\n"),
      ),

      `\n## 🔓 Unprotected Backups`,
      ...unprotectedBackups.map((backup, index) =>
        [
          `### \`[${index + 1}]\` ${backup.name ?? "Unnamed"}`,
          `🆔 \`${backup.id}\``,
          `📅 <t:${Math.floor(new Date(backup.created_at).getTime() / 1000)}:R>`,
          `💾 \`${Size.FormatSize(backup.size)}\``,
        ].join("\n"),
      ),
    ].join("\n"),
  });
}

async function createBackup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("name", true);
  const backupName = interaction.options.getString("backup_name") ?? undefined;
  const backupProtected = interaction.options.getBoolean("protected") ?? false;
  const server = DatabaseHandler.GetInstance()
    .query("SELECT * FROM servers WHERE name = ?")
    .get(name) as Server;

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Server not found!",
    });
    return;
  }

  await interaction.deferReply();

  interaction.editReply({
    content: "Creating backup...",
  });

  const request = await BackupHandler.CreateBackup(
    server,
    backupName,
    backupProtected,
  );

  if (!request) {
    interaction.editReply({
      content: "Failed to create backup!",
    });
    return;
  }

  interaction.editReply({
    content: `Successfully created backup!`,
  });
}
