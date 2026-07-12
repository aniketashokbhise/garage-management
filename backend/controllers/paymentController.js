const Payment = require("../models/Payment");

const getPayments = async (req, res, next) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.invoice) filter.invoice = req.query.invoice;

    const payments = await Payment.find(filter)
      .populate({
        path: "invoice",
        select: "invoiceNumber grandTotal customer",
        populate: { path: "customer", select: "name" },
      })
      .sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

module.exports = { getPayments };
