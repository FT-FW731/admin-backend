import { Response } from "express";
import { StatusCodes } from "http-status-codes";

class ApiResponse {
  status: number;
  data: any;
  success: boolean;
  message: string;
  res: Response;

  constructor({
    res,
    status,
    message = "Success",
    data = null,
  }: {
    res: Response;
    status: number;
    message?: string;
    data?: any;
  }) {
    this.status = status;
    this.data = data;
    this.message = message;
    this.success = status < 400;
    this.res = res;

    res.status(this.status).json({
      status: this.status,
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

export default ApiResponse;

// export class ApiError extends Error {
//   status: number;

//   constructor({ status, message }: { status: number; message: string }) {
//     super(message);
//     this.status = status;
//   }
// }

// export const handleErrorResponse = (
//   res: Response,
//   error: ApiError | Error | any
// ) => {
//   console.error(error.stack);
//   new ApiResponse({
//     res,
//     status: error?.status || StatusCodes.INTERNAL_SERVER_ERROR,
//     message: error?.message || "Internal Server Error",
//   });
// };
