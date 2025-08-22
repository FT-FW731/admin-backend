import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db/index.js";
import config from "../config/index.js";
import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/apiResponse.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { validateRequiredFields } from "../utils/helpers.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

export const createAdminUser = asyncHandler(async (req, res) => {
  const { name, email, role, password } = req.body;
  validateRequiredFields({ name, email, password, role });

  if (await prisma.adminUser.findUnique({ where: { email } })) {
    throw new ApiError({
      status: StatusCodes.CONFLICT,
      message: "User with this email already exists",
    });
  }

  const user = await prisma.adminUser.create({
    data: {
      name,
      email,
      role,
      password: await bcrypt.hash(password, 10),
    },
  });

  if (!user) {
    throw new ApiError({
      status: StatusCodes.NOT_FOUND,
      message: "User not found",
    });
  }

  new ApiResponse({
    res,
    status: 201,
    message: "User created successfully",
    data: user,
  });
});

export const signInAdminUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError({
      status: StatusCodes.UNAUTHORIZED,
      message: "Invalid email or password",
    });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
  const result = { ...user, password: undefined };

  new ApiResponse({
    res,
    status: 200,
    message: "User signed in successfully",
    data: { user: result, token },
  });
});

export const getAdminUser = asyncHandler(async (req, res) => {
  new ApiResponse({
    res,
    status: 200,
    message: "User retrieved successfully",
    data: req.user,
  });
});

export const getAllAdminUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  const validatedPage = parseInt(page as string, 10) || 1;
  const validatedLimit = parseInt(limit as string, 10) || 10;
  const searchTerm = (search as string).trim();

  const where = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { role: { contains: searchTerm } },
        ],
      }
    : {};

  const [users, totalCount] = await Promise.all([
    prisma.adminUser.findMany({
      where,
      skip: (validatedPage - 1) * validatedLimit,
      take: validatedLimit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // password: false
      },
    }),
    prisma.adminUser.count({ where }),
  ]);

  const [totalUsers, usersByRole] = await Promise.all([
    prisma.adminUser.count(),
    prisma.adminUser.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
  ]);

  const cardsData = {
    totalUsers,
    usersByRole: usersByRole.map((group) => ({
      role: group.role,
      count: group._count.role,
    })),
  };

  const totalPages = Math.ceil(totalCount / validatedLimit);
  const hasNextPage = validatedPage < totalPages;
  const hasPreviousPage = validatedPage > 1;

  const pagination = {
    currentPage: validatedPage,
    totalPages,
    totalCount,
    limit: validatedLimit,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage ? validatedPage + 1 : null,
    previousPage: hasPreviousPage ? validatedPage - 1 : null,
  };

  new ApiResponse({
    res,
    status: 200,
    message: "Users retrieved successfully",
    data: {
      users,
      pagination,
      cards: cardsData,
    },
  });
});

export const updateAdminUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password } = req.body;

  validateRequiredFields({ id });

  const user = await prisma.adminUser.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new ApiError({
      status: StatusCodes.NOT_FOUND,
      message: "User not found",
    });
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (password !== undefined)
    updateData.password = await bcrypt.hash(password, 10);

  const updatedUser = await prisma.adminUser.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  new ApiResponse({
    res,
    status: 200,
    message: "User updated successfully",
    data: updatedUser,
  });
});

export const deleteAdminUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  validateRequiredFields({ id });

  const user = await prisma.adminUser.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new ApiError({
      status: StatusCodes.NOT_FOUND,
      message: "User not found",
    });
  }

  await prisma.adminUser.delete({
    where: { id: parseInt(id) },
  });

  new ApiResponse({
    res,
    status: 200,
    message: "User deleted successfully",
  });
});
