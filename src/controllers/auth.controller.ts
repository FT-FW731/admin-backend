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
  const { name, email, role = "admin", password } = req.body;
  validateRequiredFields({ name, email, password });

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
