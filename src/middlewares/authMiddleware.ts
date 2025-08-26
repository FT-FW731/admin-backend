import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db/index.js";
import config from "../config/index.js";
import { ApiError } from "./errorHandler.js";
import { StatusCodes } from "http-status-codes";
import { AdminUserResponseDTO } from "../models/user.dto.js";

declare global {
  namespace Express {
    interface Request {
      user?: AdminUserResponseDTO;
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
 * Fetches the admin user from the database by user ID.
 * @param userId Admin user's ID
 * @returns AdminUserResponseDTO object containing admin user data
 * @throws ApiError if the admin user is not found
 */
async function fetchAdminUser(userId: number): Promise<AdminUserResponseDTO> {
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: userId },
  });
  if (!adminUser) {
    throw new ApiError({
      status: StatusCodes.UNAUTHORIZED,
      message: "User not found",
    });
  }

  const { id, name, email, role, createdAt, updatedAt } = adminUser;

  const userPerms = await prisma.adminUserPermission.findMany({
    where: { adminUserId: userId },
    include: { permission: true },
  });

  const permissions = (userPerms || []).map(
    (p: any) => `${p.permission.resource}.${p.permission.action}`
  );
  return {
    id,
    name,
    email,
    role,
    createdAt,
    updatedAt,
    permissions,
  } as AdminUserResponseDTO;
}

/**
 * Express middleware to authenticate requests using JWT.
 * Attaches the authenticated admin user to req.user if successful.
 * @param req Express request object
 * @param res Express response object
 * @param next Express next middleware function
 */
export const authProtect = async (
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

    const user = await fetchAdminUser(userId);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
