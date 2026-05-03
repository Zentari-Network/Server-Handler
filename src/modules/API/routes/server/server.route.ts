import { Router } from "express";
import ServerController from "./server.controller";

const ServerRoute = Router();

ServerRoute.post("/states/:id", ServerController.UpdateServerState);
ServerRoute.post("/create", ServerController.CreateServer);
ServerRoute.post("/:id/delete", ServerController.DeleteServer);
ServerRoute.post("/:id/start", ServerController.StartServer);
ServerRoute.post("/:id/stop", ServerController.StopServer);
ServerRoute.post("/:id/restart", ServerController.RestartServer);

ServerRoute.get("/states", ServerController.GetServerStates);
ServerRoute.get("/states/:id", ServerController.GetServerState);
ServerRoute.get("/", ServerController.GetServers);
ServerRoute.get("/self", ServerController.GetSelf);
ServerRoute.get("/:id", ServerController.GetServer);

export default ServerRoute;
