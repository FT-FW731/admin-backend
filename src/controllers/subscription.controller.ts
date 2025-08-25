import axios from "axios";
import moment from "moment";
import crypto from "crypto";
import prisma from "../db/index.js";
import clog from "../utils/customLog.js";
import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/apiResponse.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validateRequiredFields } from "../utils/helpers.js";

async function triggerPaymentWebhook(paymentEntity: any) {
  try {
    const webhookUrl = process.env.RAZORPAY_WEBHOOK_URL!;
    const secret = process.env.RAZORPAY_SECRET!;
    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: paymentEntity,
        },
      },
    };
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    await axios.post(webhookUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
      },
    });
    clog.verbose("Triggered Razorpay payment.captured webhook", {
      paymentId: paymentEntity.id,
    });
  } catch (err) {
    throw new ApiError({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      message: err instanceof Error ? err.message : "Subscription failed",
    });
  }
}

export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await prisma.subscription.findMany();
  new ApiResponse({
    res,
    status: StatusCodes.OK,
    message: "Fetched all subscriptions",
    data: subscriptions,
  });
});

export const updateSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { price, credits, description } = req.body;

  const subscription = await prisma.subscription.findUnique({
    where: { id: Number(id) },
  });
  if (!subscription) {
    throw new ApiError({
      status: StatusCodes.NOT_FOUND,
      message: "Subscription not found",
    });
  }

  const updatedSubscription = await prisma.subscription.update({
    where: { id: Number(id) },
    data: {
      price,
      ...(subscription?.type === "credits" && { credits }),
      description,
    },
  });

  new ApiResponse({
    res,
    status: StatusCodes.OK,
    message: "Subscription updated successfully",
    data: updatedSubscription,
  });
});

export const initializeOrder = asyncHandler(async (req, res) => {
  const {
    subscriptionId,
    unit = 1,
    values,
    startdate = moment().format("YYYY-MM-DD"),
    userId,
  } = req.body;

  validateRequiredFields({
    subscriptionId,
    unit,
    values,
    startdate,
    userId,
  });

  if (values.length === 0 || typeof unit !== "number" || unit === 0) {
    throw new ApiError({
      status: StatusCodes.BAD_REQUEST,
      message: "Values array is empty or unit is not a number or unit is 0",
    });
  }
  if (typeof startdate !== "string") {
    throw new ApiError({
      status: StatusCodes.BAD_REQUEST,
      message: "Missing start date or end date",
    });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!subscription) {
    throw new ApiError({
      status: StatusCodes.BAD_REQUEST,
      message: "Subscription not found",
    });
  }

  const startDate = startdate ? new Date(startdate) : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 30 * unit);

  let amount = subscription.price * unit * (values ? values.length : 1);
  let gstAmount = amount * 0.18;

  const amountInPaise = Math.round(amount * 100);

  const adminOrderId = `order-${crypto.randomBytes(8).toString("hex")}`;

  const orderRecord = await prisma.order.create({
    data: {
      razorpayOrderId: adminOrderId,
      amount: amountInPaise,
      userId: userId!,
      subscriptionId,
      unit,
      values: values.join(","),
      status: "created",
      startDate,
      endDate,
    },
  });

  await triggerPaymentWebhook({
    id: `pay-${crypto.randomBytes(8).toString("hex")}`,
    amount: orderRecord.amount,
    status: "captured",
    order_id: orderRecord.razorpayOrderId,
  });

  new ApiResponse({
    res,
    status: StatusCodes.CREATED,
    message: "Order created successfully",
    data: orderRecord,
  });
});
