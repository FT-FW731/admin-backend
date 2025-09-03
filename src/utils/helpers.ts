import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../middlewares/errorHandler.js";

/**
 * Validates required fields and throws an ApiError if any are missing
 * @param fields Object containing field name-value pairs to validate
 * @throws ApiError with BAD_REQUEST status if any required fields are missing
 */
export const validateRequiredFields = (fields: Record<string, any>): void => {
  const missingFields = Object.entries(fields)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw new ApiError({
      status: StatusCodes.BAD_REQUEST,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
};

/**
 * Split an array into chunks of the given size.
 *
 * @template T - type of array elements
 * @param {T[]} arr - The array to chunk.
 * @param {number} size - Maximum size of each chunk. Must be > 0.
 * @returns {T[][]} An array of chunks (arrays). Returns [] if input is not an array or size <= 0.
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  if (!Array.isArray(arr) || size <= 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Generate a URL-safe alphanumeric API credential string.
 *
 * This creates `length` bytes of random data, encodes it as base64,
 * strips any non-alphanumeric characters, and then truncates the
 * result to the requested `length` characters.
 *
 * Notes:
 * - If `length` is 0 or negative, an empty string will be returned.
 * - `crypto.randomBytes` may throw for invalid sizes; callers should
 *   ensure `length` is a non-negative integer.
 *
 * @param {number} length - Desired length of the credential string.
 * @returns {string} An alphanumeric string (A-Z, a-z, 0-9) up to `length` characters.
 * @example
 * generateApiCred(16); // 'aZ3b9X...'
 */
export function generateApiCred(length: number): string {
  return crypto.randomBytes(length).toString("base64").replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}
