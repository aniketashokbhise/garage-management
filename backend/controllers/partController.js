const SparePart = require("../models/SparePart");
const InventoryLog = require("../models/InventoryLog");

const getParts = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const parts = await SparePart.find({
      owner: req.user._id,
      name: { $regex: search, $options: "i" },
    }).sort({ name: 1 });
    res.json(parts);
  } catch (err) {
    next(err);
  }
};

const getLowStockParts = async (req, res, next) => {
  try {
    const parts = await SparePart.find({ owner: req.user._id });
    const lowStock = parts.filter((p) => p.quantity <= p.lowStockThreshold);
    res.json(lowStock);
  } catch (err) {
    next(err);
  }
};

const createPart = async (req, res, next) => {
  try {
    const part = await SparePart.create({ ...req.body, owner: req.user._id });

    // Record the starting stock so inventory history has a complete trail from day one.
    if (part.quantity && part.quantity !== 0) {
      await InventoryLog.create({
        owner: req.user._id,
        part: part._id,
        partName: part.name,
        type: "initial",
        quantityChange: part.quantity,
        quantityAfter: part.quantity,
        note: "Initial stock on creation",
      });
    }

    res.status(201).json(part);
  } catch (err) {
    next(err);
  }
};

const updatePart = async (req, res, next) => {
  try {
    const part = await SparePart.findOne({ _id: req.params.id, owner: req.user._id });
    if (!part) {
      res.status(404);
      throw new Error("Spare part not found");
    }

    const previousQuantity = part.quantity;
    Object.assign(part, req.body);
    await part.save();

    // If the quantity field itself was edited directly (not via restock), log it as a manual adjustment.
    const diff = part.quantity - previousQuantity;
    if (diff !== 0) {
      await InventoryLog.create({
        owner: req.user._id,
        part: part._id,
        partName: part.name,
        type: "adjustment",
        quantityChange: diff,
        quantityAfter: part.quantity,
        note: "Manual quantity edit",
      });
    }

    res.json(part);
  } catch (err) {
    next(err);
  }
};

// Dedicated endpoint for recording a purchase of new stock. Always adds to the
// existing quantity (never overwrites), and logs the purchase with supplier/cost info.
const restockPart = async (req, res, next) => {
  try {
    const { qty, supplier, costPrice, note } = req.body;
    const addQty = Number(qty);

    if (!addQty || addQty <= 0) {
      res.status(400);
      throw new Error("Quantity to add must be a positive number");
    }

    const part = await SparePart.findOne({ _id: req.params.id, owner: req.user._id });
    if (!part) {
      res.status(404);
      throw new Error("Spare part not found");
    }

    part.quantity += addQty;
    if (supplier) part.supplier = supplier;
    if (costPrice !== undefined && costPrice !== "") part.costPrice = Number(costPrice);
    await part.save();

    await InventoryLog.create({
      owner: req.user._id,
      part: part._id,
      partName: part.name,
      type: "purchase",
      quantityChange: addQty,
      quantityAfter: part.quantity,
      note: note || "Stock purchased",
      supplier: supplier || part.supplier,
      costPrice: costPrice !== undefined && costPrice !== "" ? Number(costPrice) : part.costPrice,
    });

    res.json(part);
  } catch (err) {
    next(err);
  }
};

const deletePart = async (req, res, next) => {
  try {
    const part = await SparePart.findOne({ _id: req.params.id, owner: req.user._id });
    if (!part) {
      res.status(404);
      throw new Error("Spare part not found");
    }
    await part.deleteOne();
    res.json({ message: "Spare part removed" });
  } catch (err) {
    next(err);
  }
};

// Full inventory history across all parts (for an "Inventory History" screen),
// optionally filtered to a single part via ?part=<id>.
const getInventoryHistory = async (req, res, next) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.part) filter.part = req.query.part;

    const logs = await InventoryLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("serviceOrder", "createdAt");
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

const getPartHistory = async (req, res, next) => {
  try {
    const logs = await InventoryLog.find({ owner: req.user._id, part: req.params.id }).sort({
      createdAt: -1,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getParts,
  getLowStockParts,
  createPart,
  updatePart,
  restockPart,
  deletePart,
  getInventoryHistory,
  getPartHistory,
};
