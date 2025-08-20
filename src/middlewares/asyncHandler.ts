import { ApiError, handleErrorResponse } from "./errorHandler.js";
import { RequestHandler, Request, Response, NextFunction } from "express";

const asyncHandler = (requestHandler: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(requestHandler(req, res, next)).catch(
      (error: ApiError | Error | any) => {
        handleErrorResponse(res, error);
      }
    );
  };
};

export { asyncHandler };
