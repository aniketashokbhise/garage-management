const Invoice = require("../models/Invoice");
const SparePart = require("../models/SparePart");
const ServiceOrder = require("../models/ServiceOrder");
const Customer = require("../models/Customer");
const mongoose = require("mongoose");

const getStats = async (req, res, next) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user._id);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalRevenue, monthlyRevenue, pendingOrders, totalCustomers, allParts, invoiceStats] =
      await Promise.all([
        Invoice.aggregate([
          { $match: { owner: ownerId } },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } },
        ]),
        Invoice.aggregate([
          { $match: { owner: ownerId, createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } },
        ]),
        ServiceOrder.countDocuments({ owner: ownerId, status: { $ne: "completed" } }),
        Customer.countDocuments({ owner: ownerId }),
        SparePart.find({ owner: ownerId }),
        Invoice.aggregate([
          { $match: { owner: ownerId } },
          {
            $group: {
              _id: "$paymentStatus",
              count: { $sum: 1 },
              total: { $sum: "$grandTotal" },
            },
          },
        ]),
      ]);

    const lowStockCount = allParts.filter((p) => p.quantity <= p.lowStockThreshold).length;

    // Last 6 months revenue trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTrend = await Invoice.aggregate([
      { $match: { owner: ownerId, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$grandTotal" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      pendingOrders,
      totalCustomers,
      totalParts: allParts.length,
      lowStockCount,
      invoiceStats,
      monthlyTrend,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats };
