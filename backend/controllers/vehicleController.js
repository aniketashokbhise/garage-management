const Vehicle = require("../models/Vehicle");
const ServiceOrder = require("../models/ServiceOrder");
const Invoice = require("../models/Invoice");

const getVehicles = async (req, res, next) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.customer) filter.customer = req.query.customer;
    const vehicles = await Vehicle.find(filter)
      .populate("customer", "name phone")
      .sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
};

const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user._id }).populate(
      "customer",
      "name phone"
    );
    if (!vehicle) {
      res.status(404);
      throw new Error("Vehicle not found");
    }
    const serviceHistory = await ServiceOrder.find({ vehicle: vehicle._id }).sort({
      createdAt: -1,
    });
    const invoices = await Invoice.find({ vehicle: vehicle._id }).sort({ createdAt: -1 });
    res.json({ vehicle, serviceHistory, invoices });
  } catch (err) {
    next(err);
  }
};

const createVehicle = async (req, res, next) => {
  try {
    const { customer, type, brand, model, regNumber, year, color } = req.body;
    if (!customer || !regNumber) {
      res.status(400);
      throw new Error("Customer and registration number are required");
    }
    const vehicle = await Vehicle.create({
      owner: req.user._id,
      customer,
      type,
      brand,
      model,
      regNumber,
      year,
      color,
    });
    res.status(201).json(vehicle);
  } catch (err) {
    next(err);
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user._id });
    if (!vehicle) {
      res.status(404);
      throw new Error("Vehicle not found");
    }
    Object.assign(vehicle, req.body);
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user._id });
    if (!vehicle) {
      res.status(404);
      throw new Error("Vehicle not found");
    }
    await vehicle.deleteOne();
    res.json({ message: "Vehicle removed" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
