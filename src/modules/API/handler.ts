import express from "express";
import ConfigHandler from "../../utils/config/handler";
import Logger from "../../utils/logger";
import APIMiddleware from "./middleware";
import CenterRoute from "./routes/center";

export default class APIHandler {
  public constructor() {
    this.Init();
  }

  private Init(): void {
    if (!ConfigHandler.APIEnabled()) {
      return;
    }

    Logger.Info("Starting API...");

    const server = express();

    server.use(express.json());
    server.use(APIMiddleware);
    server.use(CenterRoute);

    server.listen(ConfigHandler.APIPort(), (error) => {
      if (error) {
        Logger.Fatal("Failed to start API!");
      } else {
        Logger.Notice("API started and listening for connections!");
      }
    });
  }
}
