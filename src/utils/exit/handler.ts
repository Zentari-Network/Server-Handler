import DiscordHandler from "../../modules/discord/handler";
import Logger from "../logger";

export default class ExitHandler {
  public constructor() {
    this.Init();
  }

  private Init(): void {
    process.once("SIGTERM", () => this.OnExit());
    process.once("SIGINT", () => this.OnExit());
  }

  private async OnExit(): Promise<void> {
    Logger.Notice("Process exiting...");

    if (DiscordHandler.IsOnline()) {
      await DiscordHandler.Close();
    }

    Logger.Notice("Process safely exiting.");
    process.exit(0);
  }
}
