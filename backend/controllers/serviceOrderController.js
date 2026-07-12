const ServiceOrder = require("../models/ServiceOrder");
const SparePart = require("../models/SparePart");
const InventoryLog = require("../models/InventoryLog");

const getServiceOrders = async (req, res, next) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.vehicle) filter.vehicle = req.query.vehicle;

    const orders = await ServiceOrder.find(filter)
      .populate("customer", "name phone")
      .populate("vehicle", "brand model regNumber")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

const getServiceOrderById = async (req, res, next) => {
  try {
    const order = await ServiceOrder.findOne({ _id: req.params.id, owner: req.user._id })
      .populate("customer")
      .populate("vehicle");
    if (!order) {
      res.status(404);
      throw new Error("Service order not found");
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};

const createServiceOrder = async (req, res, next) => {
  try {
    const { customer, vehicle, odometerReading, servicesUsed, partsUsed, mechanicNotes } =
      req.body;

    if (!customer || !vehicle) {
      res.status(400);
      throw new Error("Customer and vehicle are required");
    }

    // Validate stock BEFORE creating the order, so we never create a job card
    // that oversells parts you don't actually have on the shelf.
    const partsWithQty = (partsUsed || []).filter((p) => p.part);
    if (partsWithQty.length > 0) {
      const partIds = partsWithQty.map((p) => p.part);
      const stockDocs = await SparePart.find({ _id: { $in: partIds }, owner: req.user._id });
      const stockMap = new Map(stockDocs.map((d) => [String(d._id), d]));

      for (const p of partsWithQty) {
        const stockDoc = stockMap.get(String(p.part));
        if (!stockDoc) {
          res.status(400);
          throw new Error(`Part not found in inventory: ${p.name || p.part}`);
        }
        if (stockDoc.quantity < Math.abs(p.qty)) {
          res.status(400);
          throw new Error(
            `Not enough stock for "${stockDoc.name}": have ${stockDoc.quantity}, need ${Math.abs(p.qty)}`
          );
        }
      }
    }

    const order = await ServiceOrder.create({
      owner: req.user._id,
      customer,
      vehicle,
      odometerReading,
      servicesUsed: servicesUsed || [],
      partsUsed: partsUsed || [],
      mechanicNotes,
    });

    // Deduct inventory for parts used, and log every deduction to inventory history.
    for (const p of partsWithQty) {
      const qtyUsed = Math.abs(p.qty);
      const updatedPart = await SparePart.findByIdAndUpdate(
        p.part,
        { $inc: { quantity: -qtyUsed } },
        { new: true }
      );
      await InventoryLog.create({
        owner: req.user._id,
        part: p.part,
        partName: updatedPart ? updatedPart.name : (p.name || "Unknown part"),
        type: "usage",
        quantityChange: -qtyUsed,
        quantityAfter: updatedPart ? updatedPart.quantity : 0,
        note: "Used in service job card",
        serviceOrder: order._id,
      });
    }

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

const updateServiceOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await ServiceOrder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!order) {
      res.status(404);
      throw new Error("Service order not found");
    }
    order.status = status;
    if (status === "completed") order.completedAt = new Date();
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
};

const updateServiceOrder = async (req, res, next) => {
  try {
    const order = await ServiceOrder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!order) {
      res.status(404);
      throw new Error("Service order not found");
    }
    Object.assign(order, req.body);
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
};

const deleteServiceOrder = async (req, res, next) => {
  try {
    const order = await ServiceOrder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!order) {
      res.status(404);
      throw new Error("Service order not found");
    }
    await order.deleteOne();
    res.json({ message: "Service order removed" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getServiceOrders,
  getServiceOrderById,
  createServiceOrder,
  updateServiceOrderStatus,
  updateServiceOrder,
  deleteServiceOrder,
};
