const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blacklist.model");

// REGISTER
async function registerUserController(req, res) {
    try {
        let { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "Please provide username, email and password" });
        }

        email = email.toLowerCase();

        const isUserAlreadyExists = await userModel.findOne({ $or: [{ username }, { email }] });

        if (isUserAlreadyExists) {
            return res.status(400).json({ message: "Account already exists" });
        }

        const hash = await bcrypt.hash(password, 10);
        const user = await userModel.create({ username, email, password: hash });

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            message: "User registered successfully",
            token,                          // ✅ added
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        console.error("REGISTER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// LOGIN
async function loginUserController(req, res) {
    try {
        console.log("BODY:", req.body);

        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "All fields required" });
        }

        email = email.toLowerCase();

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: "User logged in successfully",
            token,                          // ✅ added
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// LOGOUT
async function logoutUserController(req, res) {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

        if (token) {
            await tokenBlackListModel.create({ token });
        }

        res.clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "none"
        });

        res.status(200).json({ message: "User logged out successfully" });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}

// GET ME
async function getMeController(req, res) {
    try {
        const user = await userModel.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User details fetched successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
};