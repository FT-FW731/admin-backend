import cors from "cors";
import moment from "moment";
import express from "express";
import config from "./config/index.js";
import apiLogger from "./middlewares/logger.js";
import { authProtect } from "./middlewares/authMiddleware.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import recordRoutes from "./routes/records.routes.js";
import clientRoutes from "./routes/client.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import miscellaneousRoutes from "./routes/miscellaneous.routes.js";

const app = express();
const port = config.port;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(apiLogger);

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/records", authProtect, recordRoutes);
app.use("/api/v1/clients", authProtect, clientRoutes);
app.use("/api/v1/subscriptions", authProtect, subscriptionRoutes);
app.use("/api/v1/miscellaneous", authProtect, miscellaneousRoutes);

/**
 * Health check endpoint
 * @route GET /health
 * @returns JSON with server status and current time
 */
app.get("/health", (req, res) => {
  const currentTime = moment().format("hh:mm A Do MMMM YYYY");

  res.status(200).json({
    status: 200,
    success: true,
    message: "Server is healthy!",
    time: currentTime,
  });
});

/**
 * Root endpoint to verify server is running
 * @route GET /
 * @returns JSON with server status
 */
app.get("/", (req, res) => {
  res.status(200).json({
    status: 200,
    success: true,
    message: "Server is working!",
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
