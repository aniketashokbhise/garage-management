const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// @desc Register a new workshop owner
// @route POST /api/auth/register
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, workshopName } = req.body;

    if (!name || !email || !password || !workshopName) {
      res.status(400);
      throw new Error("Please provide all required fields");
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error("User already exists with this email");
    }

    const user = await User.create({ name, email, password, phone, workshopName });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      workshopName: user.workshopName,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (err) {
    next(err);
  }
};

// @desc Login user
// @route POST /api/auth/login
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        workshopName: user.workshopName,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error("Invalid email or password");
    }
  } catch (err) {
    next(err);
  }
};

// @desc Get current user profile
// @route GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    res.json(req.user);
  } catch (err) {
    next(err);
  }
};

// @desc Update workshop profile (name, address, phone, logo)
// @route PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const { workshopName, phone, address } = req.body;
    if (workshopName !== undefined) user.workshopName = workshopName;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;

    if (req.file) {
      // Remove the old logo file so uploads/logos doesn't accumulate stale images.
      if (user.logoUrl) {
        const oldPath = path.join(__dirname, "..", user.logoUrl.replace(/^\/+/, ""));
        fs.unlink(oldPath, () => {});
      }
      user.logoUrl = `/uploads/logos/${req.file.filename}`;
    }

    await user.save();

    const safeUser = await User.findById(user._id).select("-password");
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
};

module.exports = { registerUser, loginUser, getMe, updateProfile };
