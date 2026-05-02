import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import * as fs from "fs";
import path from "path";
import DatabaseHandler from "../../../utils/database/handler";
import type { Server } from "../../../utils/database/types";
import Size from "../../../utils/size";
import BackupHandler from "../../backup/handler";
import DockerHandler from "../../docker/handler";
import type { ContainerStats } from "../../docker/types";
import ServerCompletion from "../completion/server";
import type { Command } from "../types";

export default {
  autocomplete: ServerCompletion,
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Server management commands.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("createskeleton")
        .setDescription(
          "Create a server skeleton, and add it to the server list.",
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name of the server.")
            .setRequired(true),
        )
        .addNumberOption((option) =>
          option
            .setName("port")
            .setDescription("The port of the server.")
            .setMinValue(1028)
            .setMaxValue(65535)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Start a server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("The name of the server.")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stop")
        .setDescription("Stop a server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("The name of the server.")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("restart")
        .setDescription("Restart a server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("The name of the server.")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("execute")
        .setDescription("Execute a command on a server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("The name of the server.")
            .setAutocomplete(true)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("command")
            .setDescription("The command to execute.")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a server.")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription("The name of the server.")
            .setAutocomplete(true)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("consent")
            .setDescription(
              "Are you sure you would like to delete this server? Type DELETE MY SERVER to confirm.",
            )
            .setRequired(true)
            .setMinLength(16)
            .setMaxLength(16),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all servers, and their status."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("log")
        .setDescription("Get the log file of a server.")
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
        .setName("config")
        .setDescription("Edit a config for a server.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name of the server.")
            .setAutocomplete(true)
            .setRequired(true),
        )
        .addNumberOption((option) =>
          option.setName("port").setDescription("The port of the server."),
        )
        .addNumberOption((option) =>
          option
            .setName("backup_speed")
            .setDescription("The backup speed of the server in minutes."),
        )
        .addNumberOption((option) =>
          option
            .setName("backup_retention")
            .setDescription("The amount of backups to retain."),
        )
        .addStringOption((option) =>
          option
            .setName("restart_times")
            .setDescription(
              "The times to restart the server. Example, 00:00, 12:00. ALL TIMES ARE IN UTC!",
            ),
        ),
    ),
  async callback(interaction) {
    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case "execute":
        execute(interaction);
        break;

      case "stop":
        stopServer(interaction);
        break;
      case "start":
        startServer(interaction);
        break;
      case "restart":
        restartServer(interaction);
        break;

      case "createskeleton":
        createSkeleton(interaction);
        break;

      case "delete":
        deleteServer(interaction);
        break;

      case "list":
        listServers(interaction);
        break;

      case "log":
        serverLog(interaction);
        break;

      case "config":
        configServer(interaction);
        break;
    }
  },
} as Command;

async function configServer(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("name", true);
  const port = interaction.options.getNumber("port");
  const backup_speed = interaction.options.getNumber("backup_speed");
  const backup_retention = interaction.options.getNumber("backup_retention");
  const restart_times = interaction.options.getString("restart_times");
  const servers = DatabaseHandler.GetInstance()
    .query("SELECT * FROM servers")
    .all() as Server[];
  const server = servers.find((entry) => entry.name === name);

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "A server with that name does not exist!",
    });
    return;
  }
  if (!port && !backup_retention && !backup_speed && !restart_times) {
    await interaction.deferReply();

    const restartTimes = (JSON.parse(server.restart_times) as string[]).map(
      (entry) => {
        const [hours, minutes] = entry.split(":").map(Number);

        return Math.floor(hours! * 3600 + minutes! * 60);
      },
    );

    interaction.editReply({
      content: [
        `**⚙️ ${server.name}'s Config**`,
        ``,
        `🆔 **ID:** \`${server.id}\``,
        `🔌 **Port:** \`${server.port}\``,
        `💾 **Backup Speed:** ${!server.backup_speed ? "`Not Setup`" : `Every \`${server.backup_speed}\` minutes`}`,
        `📦 **Backup Retention:** \`${server.backup_retention}\` backups`,
        `🔁 **Restart Times:** ${restartTimes.length > 0 ? restartTimes.map((time) => `<t:${time}:t>`).join(", ") : "`No scheduled restarts`"}`,
        `📅 **Created:** <t:${Math.floor(new Date(server.created_at).getTime() / 1000)}:D>`,
      ].join("\n"),
    });
    return;
  }
  if (
    port &&
    servers.some((entry) => entry.port === port && entry.id !== server.id)
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "A server with that port already exists!",
    });
    return;
  }

  const formattedTimes: string[] = [];

  if (restart_times) {
    const times = restart_times.split(", ");
    const regex = /^([01]\d|2[0-3]):[0-5]\d$/;

    for (const time of times) {
      if (!regex.test(time)) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        interaction.editReply({
          content:
            "Invalid time format! Times must be in HH:mm format, and separated by a comma and space. Example: 00:00, 12:00",
        });
        return;
      }

      formattedTimes.push(time);
    }
  }

  await interaction.deferReply();

  DatabaseHandler.GetInstance().run(
    "UPDATE servers SET port = ?, backup_speed = ?, backup_retention = ?, restart_times = ? WHERE id = ?",
    [
      port ?? server.port,
      backup_speed ?? server.backup_speed,
      backup_retention ?? server.backup_retention,
      restart_times ? JSON.stringify(formattedTimes) : server.restart_times,
      server.id,
    ],
  );

  interaction.editReply({
    content: `Successfully updated config for ${name}!`,
  });
}

async function serverLog(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("name", true);
  const servers = DatabaseHandler.GetInstance()
    .query("SELECT name, id FROM servers")
    .all() as Server[];
  const server = servers.find((entry) => entry.name === name);

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Server not found!",
    });
    return;
  }

  await interaction.deferReply();

  const file = fs.readFileSync(`data/servers/${server.name}/console.log`);

  interaction.editReply({
    content: `Here is the log file for ${server.name}!`,
    files: [
      new AttachmentBuilder(Buffer.from(file), {
        name: "console.log",
      }),
    ],
  });
}

async function listServers(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const servers = DatabaseHandler.GetInstance()
    .query("SELECT * FROM servers")
    .all() as Server[];

  if (servers.length === 0) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "You have no servers created!",
    });
    return;
  }

  await interaction.deferReply();

  interaction.editReply({
    content: "Fetching servers...",
  });

  const online: Record<number, boolean> = {};
  const stats: Record<number, ContainerStats> = {};

  for (const server of servers) {
    const isOnline = await DockerHandler.IsOnline(server.id);
    const containerStats = await DockerHandler.GetStats(server.id);

    online[server.id] = isOnline;

    if (containerStats) {
      stats[server.id] = containerStats;
    }
  }

  interaction.editReply({
    content:
      "## 🖥️ Your Servers\n" +
      servers
        .map((entry) => {
          const isOnline = online[entry.id] === true;
          const backups = BackupHandler.GetBackups(entry);
          const containerStats = stats[entry.id];

          return [
            `## ${entry.name}  \`(#${entry.id})\``,

            `**Status**: ${isOnline ? "🟢 Online" : "🔴 Offline"} | **Port**: \`${entry.port}\``,

            "",
            "**📊 Performance**",
            `• **TPS**: \`N/A\``,
            `• **CPU**: \`${!isOnline ? "N/A" : containerStats?.cpu + "%"}\``,
            `• **Memory**: \`${!isOnline ? "N/A" : Size.FormatSize(!containerStats ? 0 : containerStats.memory)}\``,
            `• **Uptime**: \`${!isOnline ? "N/A" : containerStats?.uptime}\``,

            "",
            "**👥 Players**",
            `• **Online**: \`N/A\``,

            "",
            "**💾 Storage & Backups**",
            `• **Backups**: \`${backups.length}\``,
            `• **Avg Backup Size**: \`${Size.FormatSize(Size.GetAverage(backups.map((backup) => backup.size)))}\``,
            `• **Folder Size**: \`${Size.FormatSize(Size.GetSize(path.join("data", "servers", entry.name, "data")))}\``,

            "",
            `🗓️ **Created**: <t:${Math.floor(
              new Date(entry.created_at).getTime() / 1000,
            )}:D>`,

            "\n---\n",
          ].join("\n");
        })
        .join("\n"),
  });
}

async function deleteServer(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("server", true);
  const consent = interaction.options.getString("consent", true);

  if (consent !== "DELETE MY SERVER") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Invalid consent!",
    });
    return;
  }

  const servers = DatabaseHandler.GetInstance()
    .query("SELECT name, id FROM servers")
    .all() as Server[];
  const server = servers.find((entry) => entry.name === name);

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "A server with that name does not exist!",
    });
    return;
  }

  if (await DockerHandler.IsOnline(server.id)) {
    await DockerHandler.StopServer(server.id);
  }

  DatabaseHandler.GetInstance().run(`DELETE FROM servers WHERE id = ?`, [
    server.id,
  ]);

  fs.rmSync(`data/servers/${server.name}`, { recursive: true });

  await interaction.deferReply();

  interaction.editReply({
    content: "Successfully deleted server!",
  });
}

async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("server", true);
  const command = interaction.options.getString("command", true);
  const servers = DatabaseHandler.GetInstance()
    .query("SELECT name, id FROM servers")
    .all() as Server[];
  const server = servers.find((entry) => entry.name === name);

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "A server with that name does not exist!",
    });
    return;
  }
  if (!(await DockerHandler.IsOnline(server.id))) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "That server is not online!",
    });
    return;
  }

  const request = await DockerHandler.ExecuteCommand(server.id, command);

  if (!request) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Failed to execute the command!",
    });
    return;
  }

  await interaction.deferReply();

  interaction.editReply({
    content: `Successfully executed command on ${name}!`,
  });
}

async function stopServer(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("server", true);
  const servers = DatabaseHandler.GetInstance()
    .query("SELECT name, id FROM servers")
    .all() as Server[];
  const server = servers.find((entry) => entry.name === name);

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "A server with that name does not exist!",
    });
    return;
  }
  if (!(await DockerHandler.IsOnline(server.id))) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "That server is not online!",
    });
    return;
  }

  const request = await DockerHandler.StopServer(server.id);

  if (!request) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Failed to stop the server!",
    });
    return;
  }

  await interaction.deferReply();

  interaction.editReply({
    content: `Successfully stopped ${name}!`,
  });
}
async function startServer(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("server", true);
  const servers = DatabaseHandler.GetInstance()
    .query("SELECT name, id FROM servers")
    .all() as Server[];
  const server = servers.find((entry) => entry.name === name);

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "A server with that name does not exist!",
    });
    return;
  }
  if (await DockerHandler.IsOnline(server.id)) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "That server is already online!",
    });
    return;
  }

  const request = await DockerHandler.StartServer(server.id);

  if (!request) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Failed to start the server!",
    });
    return;
  }

  await interaction.deferReply();

  interaction.editReply({
    content: `Successfully started ${name}!`,
  });
}
async function restartServer(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("server", true);
  const servers = DatabaseHandler.GetInstance()
    .query("SELECT name, id FROM servers")
    .all() as Server[];
  const server = servers.find((entry) => entry.name === name);

  if (!server) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "A server with that name does not exist!",
    });
    return;
  }

  await interaction.deferReply();

  if (await DockerHandler.IsOnline(server.id)) {
    DockerHandler.StopServer(server.id);

    await new Promise<void>((resolve) => {
      const loop = setInterval(async () => {
        if (await DockerHandler.IsOnline(server.id)) {
          return;
        }

        clearInterval(loop);
        resolve();
      }, 1000);
    });
  }

  const request = await DockerHandler.StartServer(server.id);

  if (!request) {
    interaction.editReply({
      content: "Failed to restart the server!",
    });
    return;
  }

  interaction.editReply({
    content: `Successfully restarted ${name}!`,
  });
}

async function createSkeleton(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.options.getString("name", true);

  if (name.includes(" ")) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "Server name cannot contain spaces!",
    });
    return;
  }

  const port = interaction.options.getNumber("port", true);
  const servers = DatabaseHandler.GetInstance()
    .query("SELECT * FROM servers")
    .all() as Server[];

  if (
    servers.some((entry) => entry.name.toLowerCase() === name.toLowerCase())
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "A server with that name already exists!",
    });
    return;
  }
  if (servers.some((entry) => entry.port === port)) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content: "A server with that port already exists!",
    });
    return;
  }
  if (fs.existsSync(`data/servers/${name}`)) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    interaction.editReply({
      content:
        "A server folder with that name already exists! If it is not suppose to be there, just delete the folder in data/servers/",
    });
    return;
  }

  fs.mkdirSync(`data/servers/${name}`);
  fs.mkdirSync(`data/servers/${name}/backups`);
  fs.cpSync(
    "lib/templates/default/restart_countdown.json",
    `data/servers/${name}/restart_countdown.json`,
  );
  fs.cpSync("lib/templates/default/data", `data/servers/${name}/data`, {
    recursive: true,
  });

  DatabaseHandler.GetInstance().run(
    "INSERT INTO servers (name, port) VALUES (?, ?)",
    [name, port],
  );

  await interaction.deferReply();

  interaction.editReply({
    content: `Created server skeleton for ${name}!`,
  });
}
