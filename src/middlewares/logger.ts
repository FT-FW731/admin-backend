import morgan from "morgan";

/**
 * Custom Morgan token for IP address extraction
 * @param req Express request object
 * @returns The client's IP address as a string
 */
morgan.token("remote-addr", (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const remoteAddress = req.socket.remoteAddress;
  return Array.isArray(forwarded) ? forwarded[0] : forwarded || remoteAddress;
});

/**
 * Returns ANSI color code based on HTTP status
 * @param status HTTP status code
 * @returns ANSI color code string
 */
const colorize = (status: number) => {
  if (status >= 500) return "\x1b[31m"; // red
  if (status >= 400) return "\x1b[33m"; // yellow
  if (status >= 300) return "\x1b[36m"; // cyan
  if (status >= 200) return "\x1b[32m"; // green
  return "\x1b[0m"; // reset
};

/**
 * Morgan middleware for logging HTTP requests with color and IP address
 */
const apiLogger = morgan((tokens, req, res) => {
  const status = tokens.status(req, res);
  const color = colorize(parseInt(status || "0", 10));
  const contentLength = tokens.res(req, res, "content-length") || "0";

  // Format date in IST
  const istDate = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return [
    `\x1b[34m${tokens["remote-addr"](req, res)}\x1b[0m`, // blue
    `\x1b[32m${tokens.method(req, res)}\x1b[0m`, // green
    `\x1b[33m${tokens.url(req, res)}\x1b[0m`, // yellow
    `${color}${status}\x1b[0m`, // status with color
    `\x1b[35m${contentLength}\x1b[0m`, // magenta
    "-",
    `\x1b[36m${tokens["response-time"](req, res)} ms\x1b[0m`, // cyan
    `\x1b[37m${istDate}\x1b[0m`, // white time in IST
  ].join(" ");
});

export default apiLogger;
