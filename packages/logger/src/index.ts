type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const levels: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

interface Logger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
}

type LogFn = {
  (msg: string, ...args: unknown[]): void;
  (obj: Record<string, unknown>, msg: string, ...args: unknown[]): void;
};

function createLogger(minLevel: LogLevel = "info"): Logger {
  const minLevelValue = levels[minLevel];

  function makeLogFn(
    level: LogLevel,
    method: "log" | "warn" | "error",
  ): LogFn {
    return (...args: unknown[]) => {
      if (levels[level] < minLevelValue) return;

      const first = args[0];
      if (typeof first === "object" && first !== null && !Array.isArray(first)) {
        console[method](`[${level.toUpperCase()}]`, args[1], ...args.slice(2), first);
      } else {
        console[method](`[${level.toUpperCase()}]`, ...args);
      }
    };
  }

  return {
    trace: makeLogFn("trace", "log"),
    debug: makeLogFn("debug", "log"),
    info: makeLogFn("info", "log"),
    warn: makeLogFn("warn", "warn"),
    error: makeLogFn("error", "error"),
    fatal: makeLogFn("fatal", "error"),
  };
}

const isProduction =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production";

export const logger: Logger = createLogger(isProduction ? "info" : "debug");
export default logger;
