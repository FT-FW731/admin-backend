import prisma from "../db/index.js";
import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/apiResponse.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validateRequiredFields } from "../utils/helpers.js";

export const getBanners = asyncHandler(async (req, res) => {
  const banner = await prisma.banner.findFirst();
  new ApiResponse({
    res,
    status: StatusCodes.OK,
    message: "Banner retrieved successfully",
    data: [banner],
  });
});

export const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError({
      status: StatusCodes.BAD_REQUEST,
      message: "Title and description are required",
    });
  }
  let banner = await prisma.banner.findUnique({
    where: { id: Number(id) },
  });
  if (!banner) {
    banner = await prisma.banner.create({
      data: { title, description },
    });
    new ApiResponse({
      res,
      status: StatusCodes.CREATED,
      message: "Banner created successfully",
      data: banner,
    });
    return;
  }
  banner = await prisma.banner.update({
    where: { id: Number(id) },
    data: { title, description },
  });
  new ApiResponse({
    res,
    status: StatusCodes.OK,
    message: "Banner updated successfully",
    data: banner,
  });
});

export const getPortalDashboardData = asyncHandler(async (req, res) => {
  const dashboardData = await prisma.dashboard.findMany({
    select: {
      id: true,
      recordName: true,
      recordValue: true,
    },
  });
  new ApiResponse({
    res,
    status: StatusCodes.OK,
    message: "Dashboard data retrieved successfully",
    data: dashboardData,
  });
});

export const updatePortalDashboardData = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, value = 0 } = req.body;

  const dashboard = await prisma.dashboard.findUnique({
    where: { id: Number(id) || 1 },
  });

  if (!dashboard) {
    const newDashboard = await prisma.dashboard.create({
      data: { recordName: name, recordValue: Number(value) },
    });
    new ApiResponse({
      res,
      status: StatusCodes.CREATED,
      message: "Dashboard data created successfully",
      data: newDashboard,
    });
    return;
  }

  const updatedDashboard = await prisma.dashboard.update({
    where: { id: Number(id) },
    data: { recordValue: Number(value) },
  });

  new ApiResponse({
    res,
    status: StatusCodes.OK,
    message: "Dashboard data updated successfully",
    data: updatedDashboard,
  });
});
