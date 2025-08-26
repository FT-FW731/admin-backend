import moment from "moment";
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

export const getPayments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = (req.query.sortOrder as string) || "desc";
  const search = (req.query.search as string) || "";

  const validatedPage = Math.max(1, page);
  const validatedLimit = Math.min(Math.max(1, limit));
  const offset = (validatedPage - 1) * validatedLimit;

  const [payments, totalCount] = await Promise.all([
    prisma.order.findMany({
      select: {
        razorpayOrderId: true,
        user: {
          select: {
            name: true,
          },
        },
        amount: true,
        status: true,
        createdAt: true,
      },
      skip: offset,
      take: validatedLimit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      where: {
        OR: [
          {
            razorpayOrderId: {
              contains: search,
            },
          },
          {
            user: {
              name: {
                contains: search,
              },
            },
          },
        ],
      },
    }),
    prisma.order.count(
      search
        ? {
            where: {
              OR: [
                {
                  razorpayOrderId: {
                    contains: search,
                  },
                },
                {
                  user: {
                    name: {
                      contains: search,
                    },
                  },
                },
              ],
            },
          }
        : undefined
    ),
  ]);

  const totalPages = Math.ceil(totalCount / validatedLimit);
  const pagination = {
    currentPage: validatedPage,
    totalPages,
    totalCount,
    limit: validatedLimit,
    hasNextPage: validatedPage < totalPages,
    hasPreviousPage: validatedPage > 1,
    nextPage: validatedPage < totalPages ? validatedPage + 1 : null,
    previousPage: validatedPage > 1 ? validatedPage - 1 : null,
  };

  const mappedPayments = payments.map((order) => ({
    ...order,
    client: order.user?.name,
    user: undefined,
  }));

  new ApiResponse({
    res,
    status: StatusCodes.OK,
    message: "Payments retrieved successfully",
    data: {
      payments: mappedPayments,
      pagination,
    },
  });
});

export const getPaymentStats = asyncHandler(async (req, res) => {
  const STATUS_COMPLETED = "captured";
  const now = moment();

  // Calculate start date for last 6 months window (include current month)
  const startDate = now.clone().subtract(5, "months").startOf("month").toDate();

  // 1) Month-wise totals for last 6 months (status = completed)
  const monthRows: Array<{
    year: number;
    month: number;
    total: number;
    count: number;
  }> = (await prisma.$queryRaw`
      SELECT YEAR(created_at) AS year,
             MONTH(created_at) AS month,
             SUM(amount) AS total,
             COUNT(*) AS count
      FROM razorpay_payments
      WHERE status = ${STATUS_COMPLETED} AND created_at >= ${startDate}
      GROUP BY year, month
      ORDER BY year, month
    `) as any;

  // Build last-6-months labels and map results using moment
  const months: { key: string; label: string; year: number; month: number }[] =
    [];
  for (let i = 5; i >= 0; i--) {
    const m = now.clone().subtract(i, "months");
    const y = m.year();
    const monthNum = m.month() + 1;
    const key = `${y}-${String(monthNum).padStart(2, "0")}`;
    // months.push({ key, label: m.format("YYYY-MM"), year: y, month: monthNum });
    months.push({ key, label: m.format("MMM"), year: y, month: monthNum });
  }

  const monthMap = new Map<string, { total: number; count: number }>();
  for (const r of monthRows) {
    const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
    monthMap.set(key, {
      total: Number(r.total ?? 0),
      count: Number(r.count ?? 0),
    });
  }

  const monthTotals = months.map((m) => {
    const v = monthMap.get(m.key) ?? { total: 0, count: 0 };
    return { month: m.label, amount: v.total, count: v.count };
  });

  // Helper bounds for this and previous month using moment
  const thisMonthStart = now.clone().startOf("month").toDate();
  const nextMonthStart = now.clone().add(1, "month").startOf("month").toDate();
  const prevMonthStart = now
    .clone()
    .subtract(1, "month")
    .startOf("month")
    .toDate();

  // 2) Cards data
  // total completed payment count
  const totalCompletedPayments = await prisma.payment.count({
    where: { status: STATUS_COMPLETED },
  });
  const totalAmountAgg = await prisma.payment.aggregate({
    where: { status: STATUS_COMPLETED },
    _sum: { amount: true },
    _avg: { amount: true },
  });
  const mostCommonPayment = await prisma.payment.groupBy({
    by: ["amount"],
    where: { status: STATUS_COMPLETED },
    _count: { amount: true },
    orderBy: { _count: { amount: "desc" } },
    take: 1,
  });

  // this month totals/avg/count
  const thisMonthRow: Array<{
    total: number | null;
    count: number | null;
    avg: number | null;
  }> = (await prisma.$queryRaw`
      SELECT SUM(amount) AS total, COUNT(*) AS count, AVG(amount) AS avg
      FROM razorpay_payments
      WHERE status = ${STATUS_COMPLETED} AND created_at >= ${thisMonthStart} AND created_at < ${nextMonthStart}
    `) as any;

  const thisMonthTotalAmount = Number(thisMonthRow?.[0]?.total ?? 0);
  const thisMonthCount = Number(thisMonthRow?.[0]?.count ?? 0);
  const thisMonthAvg = Number(thisMonthRow?.[0]?.avg ?? 0);

  // previous month totals (for percent change)
  const prevMonthRow: Array<{ total: number | null; count: number | null }> =
    (await prisma.$queryRaw`
      SELECT SUM(amount) AS total, COUNT(*) AS count
      FROM razorpay_payments
      WHERE status = ${STATUS_COMPLETED} AND created_at >= ${prevMonthStart} AND created_at < ${thisMonthStart}
    `) as any;

  const prevMonthTotalAmount = Number(prevMonthRow?.[0]?.total ?? 0);
  const prevMonthCount = Number(prevMonthRow?.[0]?.count ?? 0);

  // Most common payment amount in this month (mode)
  const mostCommonRow: Array<{ amount: number; cnt: number }> =
    (await prisma.$queryRaw`
      SELECT amount, COUNT(*) AS cnt
      FROM razorpay_payments
      WHERE status = ${STATUS_COMPLETED} AND created_at >= ${thisMonthStart} AND created_at < ${nextMonthStart}
      GROUP BY amount
      ORDER BY cnt DESC
      LIMIT 1
    `) as any;

  const mostCommonPaymentAmountThisMonth = mostCommonRow?.[0]?.amount ?? null;
  const mostCommonPaymentCount = Number(mostCommonRow?.[0]?.cnt ?? 0);

  // Percent change of total amount from previous month to this month
  let percentChange = 0;
  let changeDirection: "increased" | "decreased" | "no_change" = "no_change";
  if (prevMonthTotalAmount === 0) {
    if (thisMonthTotalAmount === 0) {
      percentChange = 0;
      changeDirection = "no_change";
    } else {
      percentChange = 100;
      changeDirection = "increased";
    }
  } else {
    const diff = thisMonthTotalAmount - prevMonthTotalAmount;
    percentChange = Number(((diff / prevMonthTotalAmount) * 100).toFixed(2));
    if (percentChange > 0) changeDirection = "increased";
    else if (percentChange < 0) changeDirection = "decreased";
    else changeDirection = "no_change";
  }

  const cards = {
    totalCollections: Number(totalAmountAgg._sum.amount ?? 0),
    averagePaymentAmount: Number(
      Number(totalAmountAgg._avg.amount ?? 0).toFixed(2)
    ),
    mostCommonPaymentAmount: Number(mostCommonPayment[0]?.amount ?? 0),
    totalCompletedPayments: Number(totalCompletedPayments),
    thisMonth: {
      totalAmount: thisMonthTotalAmount,
      count: thisMonthCount,
      averagePayment: Number(Number(thisMonthAvg).toFixed(2)),
      mostCommonPaymentAmount: Number(mostCommonPaymentAmountThisMonth),
      mostCommonPaymentCount,
    },
    previousMonth: {
      totalAmount: prevMonthTotalAmount,
      count: prevMonthCount,
    },
    percentChangeFromPreviousMonth: percentChange,
    changeDirection,
  };

  new ApiResponse({
    res,
    status: StatusCodes.OK,
    message: "Payment stats retrieved successfully",
    data: {
      monthTotals,
      cards,
    },
  });
});
