const Service = require("../models/Service");

const getServices = async (req, res, next) => {
  try {
    const services = await Service.find({ owner: req.user._id }).sort({ name: 1 });
    res.json(services);
  } catch (err) {
    next(err);
  }
};

const createService = async (req, res, next) => {
  try {
    const service = await Service.create({ ...req.body, owner: req.user._id });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, owner: req.user._id });
    if (!service) {
      res.status(404);
      throw new Error("Service not found");
    }
    Object.assign(service, req.body);
    await service.save();
    res.json(service);
  } catch (err) {
    next(err);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, owner: req.user._id });
    if (!service) {
      res.status(404);
      throw new Error("Service not found");
    }
    await service.deleteOne();
    res.json({ message: "Service removed" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getServices, createService, updateService, deleteService };
