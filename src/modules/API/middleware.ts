import type { NextFunction, Request, Response } from "express";
import ConfigHandler from "../../utils/config/handler";

export default async function APIMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.headers.authorization !== ConfigHandler.APISecret()) {
    res.sendStatus(401);
    return;
  }

  next();
}
