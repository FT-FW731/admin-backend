import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db/index.js";
import config from "../config/index.js";
import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/apiResponse.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { validateRequiredFields } from "../utils/helpers.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

export const createClient = asyncHandler(async (req, res) => {
  const { name, email, password, mobile, company } = req.body;
  validateRequiredFields({ name, email, password, mobile });

  if (await prisma.user.findUnique({ where: { email } })) {
    throw new ApiError({
      status: StatusCodes.CONFLICT,
      message: "User with this email already exists",
    });
  }
  if (await prisma.user.findUnique({ where: { mobile } })) {
    throw new ApiError({
      status: StatusCodes.CONFLICT,
      message: "User with this mobile already exists",
    });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      mobile,
      company,
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

export const getSingleClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateRequiredFields({ id });

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new ApiError({
      status: StatusCodes.NOT_FOUND,
      message: "User not found",
    });
  }

  new ApiResponse({
    res,
    status: 200,
    message: "User retrieved successfully",
    data: user,
  });
});

export const getAllClients = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  const validatedPage = parseInt(page as string, 10) || 1;
  const validatedLimit = parseInt(limit as string, 10) || 10;
  const searchTerm = (search as string).trim();

  const where = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { company: { contains: searchTerm } },
          { mobile: { contains: searchTerm } },
        ],
      }
    : {};

  const [usersRaw, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (validatedPage - 1) * validatedLimit,
      take: validatedLimit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        mobile: true,
        credits: true,
        createdAt: true,
        updatedAt: true,
        SubUser: {
          select: { id: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const users = usersRaw.map((user) => ({
    ...user,
    SubUser: undefined,
    subUsers: user.SubUser.length,
  }));

  const [totalUsers, totalSubUsers] = await Promise.all([
    prisma.user.count(),
    prisma.subUser.count(),
  ]);
  const totalClients: number = totalUsers + totalSubUsers;

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
      cards: { totalUsers, totalSubUsers, totalClients },
    },
  });
});

export const updateClients = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, company, mobile, password } = req.body;

  validateRequiredFields({ id });

  const user = await prisma.user.findUnique({
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
  if (company !== undefined) updateData.company = company;
  if (mobile !== undefined) updateData.mobile = mobile;
  if (password !== undefined)
    updateData.password = await bcrypt.hash(password, 10);

  const updatedUser = await prisma.user.update({
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

export const deleteClients = asyncHandler(async (req, res) => {
  const { id } = req.params;

  validateRequiredFields({ id });

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new ApiError({
      status: StatusCodes.NOT_FOUND,
      message: "User not found",
    });
  }

  await prisma.user.delete({
    where: { id: parseInt(id) },
  });

  new ApiResponse({
    res,
    status: 200,
    message: "User deleted successfully",
  });
});
