type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

type LogFn = (
  msgOrObj: string | Record<string, unknown>,
  ...args: unknown[]
) => void;

interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

function formatContext(obj: Record<string, unknown>): Record<string, unknown> {
  const formatted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    formatted[key] =
      value instanceof Error
        ? { message: value.message, stack: value.stack }
        : value;
  }
  return formatted;
}

function createLogger(minLevel: LogLevel = "info"): Logger {
  const minLevelValue = levels[minLevel];

  function makeLogFn(level: LogLevel, method: "log" | "warn" | "error"): LogFn {
    return (msgOrObj: string | Record<string, unknown>, ...args: unknown[]) => {
      if (levels[level] < minLevelValue) return;

      if (typeof msgOrObj === "string") {
        // eslint-disable-next-line no-console
        console[method](`[${level.toUpperCase()}]`, msgOrObj, ...args);
      } else {
        // eslint-disable-next-line no-console
        console[method](
          `[${level.toUpperCase()}]`,
          args[0],
          ...args.slice(1),
          formatContext(msgOrObj),
        );
      }
    };
  }

  return {
    debug: makeLogFn("debug", "log"),
    info: makeLogFn("info", "log"),
    warn: makeLogFn("warn", "warn"),
    error: makeLogFn("error", "error"),
  };
}

const isProduction =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production";

export const logger: Logger = createLogger(isProduction ? "info" : "debug");
export default logger;
