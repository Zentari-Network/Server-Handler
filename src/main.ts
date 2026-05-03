import { sleep } from "bun";
import APIHandler from "./modules/API/handler";
import BackupHandler from "./modules/backup/handler";
import DiscordHandler from "./modules/discord/handler";
import DockerHandler from "./modules/docker/handler";
import RestartHandler from "./modules/restart/handler";
import ConfigHandler from "./utils/config/handler";
import DatabaseHandler from "./utils/database/handler";
import ExitHandler from "./utils/exit/handler";

new ConfigHandler();

new DockerHandler();
await DockerHandler.IsReady();

new DatabaseHandler();

await sleep(1000); // Waiting for database to be ready.

new APIHandler();
new BackupHandler();
new RestartHandler();
new DiscordHandler();
new ExitHandler();
