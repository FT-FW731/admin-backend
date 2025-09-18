import moment from "moment";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db/index.js";
import config from "../config/index.js";
import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/apiResponse.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { generateApiCred, validateRequiredFields } from "../utils/helpers.js";

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
      apikey: generateApiCred(12),
      apisecret: generateApiCred(40),
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
  const { page = 1, limit = 10 } = req.query;

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

  const validatedPage = parseInt(page as string, 10) || 1;
  const validatedLimit = parseInt(limit as string, 10) || 10;

  const paymentsWhere = { order: { userId: parseInt(id) } };

  const [payments, totalCount] = await Promise.all([
    prisma.payment.findMany({
      where: paymentsWhere,
      skip: (validatedPage - 1) * validatedLimit,
      take: validatedLimit,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            razorpayOrderId: true,
            amount: true,
            userId: true,
            subscriptionId: true,
            startDate: true,
            endDate: true,
            subscription: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where: paymentsWhere }),
  ]);

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
    message: "User retrieved successfully",
    data: {
      user,
      payments: {
        records: payments,
        pagination,
      },
    },
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
  const {
    name,
    email,
    company,
    mobile,
    password,
    credits,
    designation,
    website,
    state,
  } = req.body;

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

  if (credits !== undefined) {
    const creditsNum = Number(credits);
    if (!Number.isNaN(creditsNum) && Number.isFinite(creditsNum)) {
      updateData.credits = Math.max(0, Math.floor(creditsNum));
    }
  }

  if (designation !== undefined) updateData.designation = designation;
  if (website !== undefined) updateData.website = website;
  if (state !== undefined) updateData.state = state;

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

export const getClientsLoginHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const sortBy = (req.query.sortBy as string) || "loginAt";
  const sortOrder = (req.query.sortOrder as string) || "desc";
  const search = (req.query.search as string || "").trim();

  const offset = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { user: { name: { startsWith: search } } },
      { subUser: { name: { startsWith: search } } }
    ];
  }

  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  const [userLogins, totalCount] = await Promise.all([
    prisma.loginHistory.findMany({
      select: {
        id: true,
        loginAt: true,
        user: { select: { name: true, email: true } },
        subUser: { select: { name: true, email: true } }
      },
      skip: offset,
      take: limit,
      orderBy,
      where: Object.keys(where).length ? where : undefined,
    }),
    prisma.loginHistory.count({
      where: Object.keys(where).length ? where : undefined,
    })
  ]);
  const totalPages = Math.ceil(totalCount / limit);

  const formattedLogins: Array<{ id: number; name: string; email: string, role: string; loginAt: Date }> = userLogins.map(login => ({
    id: login.id,
    name: login.user ? login.user.name : (login.subUser ? login.subUser.name : '-'),
    email: login.user ? login.user.email : (login.subUser ? login.subUser.email : '-'),
    role: login.user ? 'User' : (login.subUser ? 'SubUser' : '-'),
    loginAt: login.loginAt,
  }));

  // Card data calculations
  const last24Hours = moment().subtract(24, 'hours').toDate();
  const totalLoginsLast24Hours = await prisma.loginHistory.count({
    where: {
      loginAt: { gte: last24Hours }
    }
  });

  const uniqueUserIds = await prisma.loginHistory.findMany({
    select: { userId: true, subUserId: true }
  });
  const userSet = new Set<number>();
  const subUserSet = new Set<number>();
  uniqueUserIds.forEach(({ userId, subUserId }) => {
    if (userId) userSet.add(userId);
    if (subUserId) subUserSet.add(subUserId);
  });
  const uniqueUsers = userSet.size + subUserSet.size;

  new ApiResponse({
    res,
    status: StatusCodes.OK,
    message: "Login history retrieved successfully",
    data: {
      logins: formattedLogins,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
      },
      cards: {
        totalLogins: totalLoginsLast24Hours,
        totalUsers: userSet.size,
        totalSubUsers: subUserSet.size,
        totalClients: userSet.size + subUserSet.size,
        uniqueUsers
      }
    }
  });
});