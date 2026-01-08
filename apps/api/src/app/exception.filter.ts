import type { Request, Response } from "express";

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      exception instanceof HttpException
        ? exception.message ?? `${status >= 500 ? "Service Error" : "Client Error"}`
        : "Service Error";

    const requestLine = request
      ? `${request.method} ${request.originalUrl ?? request.url}`
      : "<unknown request>";
    this.logException(exception as any, requestLine);

    const errorResponse = {
      data: {},
      message,
    };

    if (
      typeof exceptionResponse === "object" &&
      exceptionResponse &&
      Object.prototype.hasOwnProperty.call(exceptionResponse, "message")
    ) {
      errorResponse.message = (exceptionResponse as any)["message"];
    }
    response.status(status);
    response.header("Content-Type", "application/json; charset=utf-8");
    response.send(errorResponse);
  }

  private logException(exception: unknown, requestLine: string) {
    if (exception instanceof AggregateError) {
      this.logger.error(`[${requestLine}] AggregateError: ${exception.message}`);
      const errors = (exception as any).errors as unknown[] | undefined;
      if (Array.isArray(errors)) {
        for (const err of errors) {
          if (err instanceof Error) {
            this.logger.error(`[${requestLine}]  - ${err.name}: ${err.message}`, err.stack);
          } else {
            this.logger.error(`[${requestLine}]  - ${JSON.stringify(err)}`);
          }
        }
      }
      if ((exception as any).stack) {
        this.logger.error(`[${requestLine}] AggregateError stack`, (exception as any).stack);
      }
      return;
    }

    if (exception instanceof Error) {
      this.logger.error(
        `[${requestLine}] ${exception.name}: ${exception.message}`,
        exception.stack,
      );
      return;
    }

    this.logger.error(`[${requestLine}] Non-Error thrown: ${JSON.stringify(exception)}`);
  }
}
