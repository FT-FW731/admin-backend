import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db/index.js";
import config from "../config/index.js";
import { ApiError } from "./errorHandler.js";
import { StatusCodes } from "http-status-codes";
import { UserResponseDTO } from "../models/user.dto.js";

declare global {
  namespace Express {
    interface Request {
      user?: UserResponseDTO;
    }
  }
}

/**
 * Extracts the JWT token from the Authorization header of the request.
 * @param req Express request object
 * @returns The JWT token string
 * @throws ApiError if the token is missing or malformed
 */
function extractToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError({
      status: StatusCodes.UNAUTHORIZED,
      message: "Authorization token missing",
    });
  }
  return authHeader.slice(7);
}

/**
 * Verifies the JWT token and returns its payload.
 * @param token JWT token string
 * @returns Decoded JWT payload
 * @throws ApiError if the token is invalid or expired
 */
function verifyJwtToken(token: string): jwt.JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (typeof decoded !== "object" || !("userId" in decoded)) {
      throw new ApiError({
        status: StatusCodes.UNAUTHORIZED,
        message: "Invalid token payload",
      });
    }
    return decoded as jwt.JwtPayload;
  } catch {
    throw new ApiError({
      status: StatusCodes.UNAUTHORIZED,
      message: "Invalid or expired authorization token",
    });
  }
}

/**
 * Fetches the user from the database by user ID.
 * @param userId User's ID
 * @returns UserResponseDTO object containing user data
 * @throws ApiError if the user is not found
 */
async function fetchUser(userId: number): Promise<UserResponseDTO> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError({
      status: StatusCodes.UNAUTHORIZED,
      message: "User not found",
    });
  }

  const { id, name, email, company, mobile, createdAt, updatedAt } = user;
  return { id, name, email, company, mobile, createdAt, updatedAt };
}

/**
 * Express middleware to authenticate requests using JWT.
 * Attaches the authenticated user to req.user if successful.
 * @param req Express request object
 * @param res Express response object
 * @param next Express next middleware function
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    const decoded = verifyJwtToken(token);
    const userId = Number(decoded.id || decoded.userId);
    if (isNaN(userId)) {
      throw new ApiError({
        status: StatusCodes.UNAUTHORIZED,
        message: "Invalid user ID in token",
      });
    }

    const user = await fetchUser(userId);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
