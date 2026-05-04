type LogContext = Record<string, string | number | boolean | null | undefined>

function write(level: "info" | "warning" | "error", message: string, context: LogContext = {}) {
  const payload = { level, message, context, timestamp: new Date().toISOString() }

  if (level === "error") {
    console.error(payload)
    return
  }

  if (level === "warning") {
    console.warn(payload)
    return
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(payload)
  }
}

export function logInfo(message: string, context?: LogContext) {
  write("info", message, context)
}

export function logWarning(message: string, context?: LogContext) {
  write("warning", message, context)
}

export function logError(message: string, context?: LogContext) {
  write("error", message, context)
}
