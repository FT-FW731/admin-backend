import fs from "fs";
import path from "path";
import winston from "winston";

/**
 * Interface for log level configuration including emoji, color, and background color
 */
interface LevelConfig {
  readonly emoji: string;
  readonly color: string;
  readonly bg: string;
}

/**
 * Interface for log level configurations mapping
 */
interface LevelConfigMap {
  readonly [key: string]: LevelConfig;
}

/**
 * Interface for metadata object that can contain any key-value pairs
 */
interface LogMetadata {
  [key: string]: unknown;
}

/**
 * Interface for timer utility return object
 */
interface Timer {
  end: (message?: string) => void;
  getElapsed: () => number;
}

/**
 * Interface for child logger methods
 */
interface ChildLogger {
  error: (message: string, meta?: LogMetadata) => void;
  warn: (message: string, meta?: LogMetadata) => void;
  info: (message: string, meta?: LogMetadata) => void;
  http: (message: string, meta?: LogMetadata) => void;
  verbose: (message: string, meta?: LogMetadata) => void;
  debug: (message: string, meta?: LogMetadata) => void;
  silly: (message: string, meta?: LogMetadata) => void;
  success: (message: string, meta?: LogMetadata) => void;
  fail: (message: string, meta?: LogMetadata) => void;
  start: (message: string, meta?: LogMetadata) => void;
  complete: (message: string, meta?: LogMetadata) => void;
  timer: (label: string) => Timer;
}

/**
 * Interface for enhanced logger with utility methods
 */
interface EnhancedLogger {
  level: string;
  error: (message: string, meta?: LogMetadata) => void;
  warn: (message: string, meta?: LogMetadata) => void;
  info: (message: string, meta?: LogMetadata) => void;
  http: (message: string, meta?: LogMetadata) => void;
  verbose: (message: string, meta?: LogMetadata) => void;
  debug: (message: string, meta?: LogMetadata) => void;
  silly: (message: string, meta?: LogMetadata) => void;
  child: (service: string) => ChildLogger;
  success: (message: string, meta?: LogMetadata) => void;
  fail: (message: string, meta?: LogMetadata) => void;
  start: (message: string, meta?: LogMetadata) => void;
  complete: (message: string, meta?: LogMetadata) => void;
  timer: (label: string) => Timer;
  setLevel: (level: string) => void;
}

/**
 * Configuration constants for better maintainability
 */
const CONFIG = {
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES: 5,
  TIMESTAMP_FORMAT: "DD/MM/YYYY hh:mm:ss A",
  LOGS_DIR: path.join(process.cwd(), "logs"),
} as const;

/**
 * Enhanced emoji and color mapping for different log levels (immutable)
 */
const LEVEL_CONFIG: LevelConfigMap = Object.freeze({
  error: { emoji: "🔥", color: "\x1b[91m", bg: "\x1b[41m" },
  warn: { emoji: "⚠️ ", color: "\x1b[93m", bg: "\x1b[43m" },
  info: { emoji: "💡", color: "\x1b[96m", bg: "\x1b[46m" },
  http: { emoji: "🌐", color: "\x1b[95m", bg: "\x1b[45m" },
  verbose: { emoji: "📝", color: "\x1b[92m", bg: "\x1b[42m" },
  debug: { emoji: "🔍", color: "\x1b[94m", bg: "\x1b[44m" },
  silly: { emoji: "🎭", color: "\x1b[90m", bg: "\x1b[100m" },
});

/**
 * ANSI color codes for better performance (no regex needed)
 */
const ANSI_CODES = Object.freeze({
  RESET: "\x1b[0m",
  CYAN: "\x1b[36m",
  BRIGHT_CYAN: "\x1b[96m",
  WHITE: "\x1b[97m",
  GRAY: "\x1b[90m",
  BRIGHT_BLACK_BG: "\x1b[100m",
});

/**
 * Utility function to ensure logs directory exists
 */
const ensureLogsDirectory = (): void => {
  try {
    if (!fs.existsSync(CONFIG.LOGS_DIR)) {
      fs.mkdirSync(CONFIG.LOGS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error("Failed to create logs directory:", error);
  }
};

/**
 * Optimized function to clean ANSI codes from level string
 */
const cleanLevel = (level: string): string => {
  return level.replace(/\u001b\[.*?m/g, "");
};

/**
 * Optimized function to safely stringify metadata
 */
const safeStringify = (obj: LogMetadata): string => {
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        return value;
      },
      2
    );
  } catch {
    return "[Unable to serialize metadata]";
  }
};

/**
 * Enhanced console format with better performance and readability
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: CONFIG.TIMESTAMP_FORMAT }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const levelClean = cleanLevel(level);
    const config = LEVEL_CONFIG[levelClean] || {
      emoji: "📋",
      color: "\x1b[37m",
      bg: "\x1b[47m",
    };

    // Optimized string building
    const coloredTimestamp = `${ANSI_CODES.CYAN}[${ANSI_CODES.BRIGHT_CYAN}${timestamp}${ANSI_CODES.CYAN}]${ANSI_CODES.RESET}`;
    const serviceTag = service
      ? `${ANSI_CODES.BRIGHT_BLACK_BG}${ANSI_CODES.WHITE}[${service}]${ANSI_CODES.RESET}`
      : "";
    const levelIndicator = `${config.bg}${
      ANSI_CODES.WHITE
    } ${levelClean.toUpperCase()} ${ANSI_CODES.RESET}`;

    let logLine = `${coloredTimestamp} ${config.emoji} ${levelIndicator}${
      serviceTag ? " " + serviceTag : ""
    }\n`;
    logLine += `${ANSI_CODES.WHITE}┌─${ANSI_CODES.RESET} ${config.color}${message}${ANSI_CODES.RESET}`;

    // Enhanced metadata display with better performance
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      logLine += `\n${ANSI_CODES.WHITE}├─${ANSI_CODES.RESET} ${ANSI_CODES.GRAY}Metadata:${ANSI_CODES.RESET}`;
      const metaStr = safeStringify(meta);
      const metaLines = metaStr.split("\n");
      metaLines.forEach((line, index) => {
        const prefix = index === metaLines.length - 1 ? "└─" : "├─";
        logLine += `\n${ANSI_CODES.WHITE}${prefix}${ANSI_CODES.RESET} ${ANSI_CODES.GRAY}${line}${ANSI_CODES.RESET}`;
      });
    } else {
      logLine += `\n${ANSI_CODES.WHITE}└─────────────────────────────────────────${ANSI_CODES.RESET}`;
    }

    return logLine;
  })
);

/**
 * Enhanced file format for log files with structured data
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: CONFIG.TIMESTAMP_FORMAT }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const serviceTag = service ? `[${service}]` : "";
    const metaString = Object.keys(meta).length
      ? ` | DATA: ${safeStringify(meta)}`
      : "";
    return `[${timestamp}] ${level.toUpperCase().padEnd(7)}${serviceTag.padEnd(
      12
    )}: ${message}${metaString}`;
  })
);

/**
 * Initialize logs directory
 */
ensureLogsDirectory();

/**
 * Define custom colors for log levels
 */
winston.addColors({
  error: "bold red",
  warn: "bold yellow",
  info: "bold cyan",
  http: "bold magenta",
  verbose: "bold green",
  debug: "bold blue",
  silly: "bold grey",
});

/**
 * Create the enhanced Winston logger with optimized configuration
 */
const createLogger = (): EnhancedLogger => {
  const logger = winston.createLogger({
    level: CONFIG.LOG_LEVEL,
    levels: winston.config.npm.levels,
    defaultMeta: { timestamp: new Date().toISOString() },
    transports: [
      new winston.transports.Console({
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true,
      }),
      new winston.transports.File({
        filename: path.join(CONFIG.LOGS_DIR, "app.log"),
        format: fileFormat,
        maxsize: CONFIG.MAX_FILE_SIZE,
        maxFiles: CONFIG.MAX_FILES,
        tailable: true,
      }),
      new winston.transports.File({
        filename: path.join(CONFIG.LOGS_DIR, "error.log"),
        level: "error",
        format: fileFormat,
        maxsize: CONFIG.MAX_FILE_SIZE,
        maxFiles: CONFIG.MAX_FILES,
        tailable: true,
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(CONFIG.LOGS_DIR, "exceptions.log"),
        format: fileFormat,
      }),
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(CONFIG.LOGS_DIR, "rejections.log"),
        format: fileFormat,
      }),
    ],
    exitOnError: false,
  }) as unknown as EnhancedLogger;

  // Enhanced timer implementation with better performance tracking
  const createTimer = (label: string, service?: string): Timer => {
    const start = performance.now();
    return {
      end: (message = "") => {
        const elapsed = Math.round(performance.now() - start);
        const meta: LogMetadata = { duration: `${elapsed}ms` };
        if (service) meta.service = service;

        logger.info(`⏱️  ${label} ${message}`, meta);
      },
      getElapsed: () => Math.round(performance.now() - start),
    };
  };

  // Enhanced child logger factory with memoization for better performance
  const childLoggerCache = new Map<string, ChildLogger>();

  logger.child = (service: string): ChildLogger => {
    if (childLoggerCache.has(service)) {
      return childLoggerCache.get(service)!;
    }

    const childLogger: ChildLogger = {
      error: (message: string, meta: LogMetadata = {}) =>
        logger.error(message, { service, ...meta }),
      warn: (message: string, meta: LogMetadata = {}) =>
        logger.warn(message, { service, ...meta }),
      info: (message: string, meta: LogMetadata = {}) =>
        logger.info(message, { service, ...meta }),
      http: (message: string, meta: LogMetadata = {}) =>
        logger.http(message, { service, ...meta }),
      verbose: (message: string, meta: LogMetadata = {}) =>
        logger.verbose(message, { service, ...meta }),
      debug: (message: string, meta: LogMetadata = {}) =>
        logger.debug(message, { service, ...meta }),
      silly: (message: string, meta: LogMetadata = {}) =>
        logger.silly(message, { service, ...meta }),
      success: (message: string, meta: LogMetadata = {}) =>
        logger.info(`✅ ${message}`, { service, ...meta }),
      fail: (message: string, meta: LogMetadata = {}) =>
        logger.error(`❌ ${message}`, { service, ...meta }),
      start: (message: string, meta: LogMetadata = {}) =>
        logger.info(`🚀 Starting: ${message}`, { service, ...meta }),
      complete: (message: string, meta: LogMetadata = {}) =>
        logger.info(`🎯 Completed: ${message}`, { service, ...meta }),
      timer: (label: string): Timer => createTimer(label, service),
    };

    childLoggerCache.set(service, childLogger);
    return childLogger;
  };

  // Add utility methods to main logger
  logger.success = (message: string, meta: LogMetadata = {}) =>
    logger.info(`✅ ${message}`, meta);
  logger.fail = (message: string, meta: LogMetadata = {}) =>
    logger.error(`❌ ${message}`, meta);
  logger.start = (message: string, meta: LogMetadata = {}) =>
    logger.info(`🚀 Starting: ${message}`, meta);
  logger.complete = (message: string, meta: LogMetadata = {}) =>
    logger.info(`🎯 Completed: ${message}`, meta);
  logger.timer = (label: string): Timer => createTimer(label);
  logger.setLevel = (level: string) => {
    logger.level = level;
  };

  return logger;
};

/**
 * Create and export the enhanced logger instance
 */
const clog = createLogger();

/**
 * Graceful shutdown handler
 */
process.on("exit", () => {
  clog.info("Logger shutting down gracefully");
});

export default clog;
export type { EnhancedLogger, ChildLogger, LogMetadata, Timer };
