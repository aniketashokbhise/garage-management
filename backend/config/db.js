const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Bring indexes in the database in line with what's currently defined in the schemas.
    // This matters specifically because Invoice.invoiceNumber used to have a global
    // `unique: true` index; that old index stays in MongoDB until something tells it to
    // sync, even after the schema is changed to a per-owner compound index instead.
    const Invoice = require("../models/Invoice");
    await Invoice.syncIndexes();
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
