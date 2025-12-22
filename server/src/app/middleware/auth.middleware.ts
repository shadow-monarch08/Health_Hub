import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../config/prisma.config";
import { env } from "../../config/environment.config";

interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    ) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
