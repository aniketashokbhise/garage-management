const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern || err.keyValue || {}).filter((f) => f !== "owner");
    if (field.includes("email")) {
      message = "An account with this email already exists";
    } else if (field.includes("regNumber")) {
      message = "A vehicle with this registration number already exists";
    } else if (field.includes("invoiceNumber")) {
      message = "That invoice number is already in use — please try again";
    } else if (field.includes("employeeId")) {
      message = "That employee ID is already in use — please try again";
    } else if (field.includes("date") && field.includes("employee")) {
      message = "Attendance for this employee and date already exists";
    } else {
      message = `Duplicate value for: ${field.join(", ") || "unknown field"}`;
    }
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
