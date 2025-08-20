/**
 * Loads environment variables and provides application configuration.
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

/**
 * Application configuration interface.
 */
interface Config {
  port: number;
  nodeEnv: "development" | "production" | "test";
  databaseUrl: string;
  jwtSecret: string;
  saltRounds: number;
}

/**
 * Parses a string to a number, returning a fallback if parsing fails.
 * @param value The string value to parse.
 * @param fallback The fallback number if parsing fails.
 * @returns The parsed number or the fallback.
 */
function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

const config: Config = {
  port: parseNumber(process.env.PORT, 3000),
  nodeEnv: (process.env.NODE_ENV as Config["nodeEnv"]) || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "",
  saltRounds: parseNumber(process.env.SALT_ROUNDS, 10),
};

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

if (!config.jwtSecret) {
  throw new Error("JWT_SECRET environment variable is required");
}

export default config;
