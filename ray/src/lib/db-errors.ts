export const PUTMEIN_INSTALL_COMMAND = "curl -fsSL https://putme.in/install.sh | bash";

export interface DatabaseErrorInfo {
  isDbInitError: boolean;
  userMessage: string;
  command?: string;
  hint?: string;
  code?: string;
}

/**
 * Checks whether an error is caused by missing tables, connection failure,
 * or uninitialized database state.
 */
export function isDatabaseInitError(error: unknown): boolean {
  if (!error) return false;

  const err =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : undefined;
  const code = typeof err?.code === "string" ? err.code : "";
  const message = (
    typeof err?.message === "string"
      ? err.message
      : typeof error === "string"
      ? error
      : ""
  ).toLowerCase();

  // Known Prisma error codes:
  // P2021: Table does not exist
  // P2039: Unmapped driver error / pool timeout
  // P1001: Can't reach database server
  // P1000: Authentication failed against database
  // P1002: Database server reached but timed out
  // P1003: Database does not exist
  // P1017: Server has closed the connection
  if (
    code === "P2021" ||
    code === "P2039" ||
    code === "P1001" ||
    code === "P1000" ||
    code === "P1002" ||
    code === "P1003" ||
    code === "P1017"
  ) {
    return true;
  }

  // Check error name or constructor
  const errorName = typeof err?.name === "string" ? err.name : "";
  if (
    errorName === "PrismaClientInitializationError" ||
    errorName === "PrismaClientRustPanicError"
  ) {
    return true;
  }

  // String signatures for table or database connectivity issues
  const dbSignatures = [
    "table `users` does not exist",
    "table 'users' does not exist",
    "the table `users` does not exist",
    "table does not exist",
    "tables do not exist",
    "doesn't exist in the current database",
    "doesn't exist",
    "table 'putmein.users' doesn't exist",
    "can't reach database server",
    "cannot reach database server",
    "database_url environment variable is missing",
    "connect econnrefused",
    "econnrefused",
    "access denied for user",
    "invalid `prisma.",
    "prismaclientinitializationerror",
    "pool timeout",
    "failed to retrieve a connection from pool",
    "connection pool",
    "acquire timeout",
    "connect timeout",
    "p2039",
  ];

  return dbSignatures.some((sig) => message.includes(sig));
}

/**
 * Categorizes and formats an error for API responses to prevent raw
 * stack traces/Prisma invocation details from leaking to clients.
 */
export function formatDatabaseErrorResponse(error: unknown): DatabaseErrorInfo {
  const err =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : undefined;
  const code = typeof err?.code === "string" ? err.code : undefined;
  const message = (
    typeof err?.message === "string"
      ? err.message
      : typeof error === "string"
      ? error
      : ""
  ).toLowerCase();

  const isPoolTimeout =
    code === "P2039" ||
    message.includes("pool timeout") ||
    message.includes("failed to retrieve a connection from pool") ||
    message.includes("acquire timeout");

  if (isPoolTimeout) {
    return {
      isDbInitError: true,
      userMessage: "Database connection timed out or database service is temporarily unavailable.",
      command: PUTMEIN_INSTALL_COMMAND,
      hint: "Please ensure the database service is running. Try running the PutmeIn command to verify database services.",
      code: code || "DB_POOL_TIMEOUT",
    };
  }

  if (isDatabaseInitError(error)) {
    return {
      isDbInitError: true,
      userMessage: "Database tables are not initialized or the database service is unavailable.",
      command: PUTMEIN_INSTALL_COMMAND,
      hint: "Try running the PutmeIn installation command in your terminal to initialize database tables and services.",
      code: code || "DB_INIT_REQUIRED",
    };
  }

  return {
    isDbInitError: false,
    userMessage: "An unexpected error occurred. Please try again.",
    code,
  };
}
