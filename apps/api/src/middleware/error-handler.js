export function errorHandler(error, _req, res, _next) {
  const status = error.statusCode || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: {
      message: error.message || "Unexpected server error",
      code: error.code || "INTERNAL_ERROR"
    }
  });
}
