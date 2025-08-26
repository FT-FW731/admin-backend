import prisma from "../db/index.js";
import config from "../config/index.js";
import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/apiResponse.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { validateRequiredFields } from "../utils/helpers.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

export const createPermission = asyncHandler(async (req, res) => {
  if (config.nodeEnv === "production") {
    throw new ApiError({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error",
    });
  }
  const { description, resource, action } = req.body;
  validateRequiredFields({ resource, action });

  const exists = await prisma.permission.findFirst({
    where: { resource, action },
  });
  if (exists) {
    throw new ApiError({
      status: StatusCodes.CONFLICT,
      message: "Permission already exists",
    });
  }

  const permission = await prisma.permission.create({
    data: { description, resource, action },
  });

  new ApiResponse({
    res,
    status: 201,
    message: "Permission created",
    data: permission,
  });
});

export const getAllPermissions = asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({
    orderBy: { resource: "asc" },
    where: {
      action: "edit", // only taking edit permissions for simplicity
    },
  });
  new ApiResponse({
    res,
    status: 200,
    message: "Permissions retrieved",
    data: permissions,
  });
});

export const assignPermissionsToUser = asyncHandler(async (req, res) => {
  const { userId, permissionIds, permissions, replace } = req.body as any;
  validateRequiredFields({ userId });

  const user = await prisma.adminUser.findUnique({
    where: { id: Number(userId) },
  });
  if (!user) {
    throw new ApiError({
      status: StatusCodes.NOT_FOUND,
      message: "Admin user not found",
    });
  }

  let permRows: any[] = [];
  if (permissions && Array.isArray(permissions) && permissions.length > 0) {
    const pairs = permissions.map((p: string) => {
      const [resource, action] = p.split(".");
      return { resource, action };
    });
    permRows = await prisma.permission.findMany({ where: { OR: pairs } });
  }

  if (
    permissionIds &&
    Array.isArray(permissionIds) &&
    permissionIds.length > 0
  ) {
    const byId = await prisma.permission.findMany({
      where: { id: { in: permissionIds.map(Number) } },
    });
    permRows = permRows.concat(byId);
  }

  if (!permRows.length) {
    throw new ApiError({
      status: StatusCodes.NOT_FOUND,
      message: "No valid permissions provided",
    });
  }

  // dedupe
  const uniquePerms = Array.from(
    new Map(permRows.map((p) => [p.id, p])).values()
  );
  const createData = uniquePerms.map((p) => ({
    adminUserId: Number(userId),
    permissionId: p.id,
  }));

  if (replace === true) {
    await prisma.$transaction([
      prisma.adminUserPermission.deleteMany({
        where: { adminUserId: Number(userId) },
      }),
      prisma.adminUserPermission.createMany({
        data: createData,
        skipDuplicates: true,
      }),
    ]);
    new ApiResponse({ res, status: 200, message: "User permissions replaced" });
    return;
  }

  await prisma.adminUserPermission.createMany({
    data: createData,
    skipDuplicates: true,
  });
  new ApiResponse({ res, status: 200, message: "Permissions assigned" });
});
