import { Router } from "express";
import ServerRoute from "./server/server.route";

const CenterRoute = Router();

CenterRoute.use("/servers", ServerRoute);

export default CenterRoute;
