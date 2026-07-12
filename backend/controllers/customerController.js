const Customer = require("../models/Customer");
const Vehicle = require("../models/Vehicle");

const getCustomers = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const customers = await Customer.find({
      owner: req.user._id,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    next(err);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, owner: req.user._id });
    if (!customer) {
      res.status(404);
      throw new Error("Customer not found");
    }
    const vehicles = await Vehicle.find({ customer: customer._id });
    res.json({ customer, vehicles });
  } catch (err) {
    next(err);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name || !phone) {
      res.status(400);
      throw new Error("Name and phone are required");
    }
    const customer = await Customer.create({
      owner: req.user._id,
      name,
      phone,
      email,
      address,
    });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, owner: req.user._id });
    if (!customer) {
      res.status(404);
      throw new Error("Customer not found");
    }
    Object.assign(customer, req.body);
    await customer.save();
    res.json(customer);
  } catch (err) {
    next(err);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, owner: req.user._id });
    if (!customer) {
      res.status(404);
      throw new Error("Customer not found");
    }
    await customer.deleteOne();
    res.json({ message: "Customer removed" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
