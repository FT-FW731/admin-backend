import prisma from "../db/index.js";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "./errorHandler.js";
import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../constants/user.constants.js";

/**
 * authorize(permission: string)
 * Usage: router.get('/...', authProtect, authorize(PERMISSIONS.SUBSCRIPTION.VIEW), handler)
 */
export const authorize = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        throw new ApiError({
          status: StatusCodes.UNAUTHORIZED,
          message: "Unauthenticated",
        });
      }
      if (user.role === USER_ROLES.ADMIN) {
        return next();
      }

      const [resource, action] = permission.split(".");
      if (!resource || !action) {
        throw new ApiError({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Invalid permission format",
        });
      }

      // find permission record
      const perm = await prisma.permission
        .findFirst({ where: { resource, action } })
        .catch(() => null);

      if (!perm) {
        // No such permission defined in DB => deny
        throw new ApiError({
          status: StatusCodes.FORBIDDEN,
          message: "Permission not defined",
        });
      }

      const found = await prisma.adminUserPermission
        .findFirst({
          where: { adminUserId: user.id, permissionId: perm.id },
        })
        .catch(() => null);

      if (!found) {
        throw new ApiError({
          status: StatusCodes.FORBIDDEN,
          message: "Insufficient permissions",
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
