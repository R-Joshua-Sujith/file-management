// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv");
const { verify } = require("./authMiddleware")
dotenv.config();
const secretKey = process.env.JWT_SECRET_KEY;

// Create a new admin user
router.post('/create-admin', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Validate required fields
        if (!username || !password || !email) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if the username or email is already taken
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the admin user
        const adminUser = new User({ username, password: hashedPassword, email, role: 'admin' });
        await adminUser.save();

        res.status(201).json(adminUser);
    } catch (error) {
        res.status(500).json({ error: 'Error creating admin user' });
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const userAgent = req.headers['user-agent'];
    const currentTime = new Date().toISOString();

    const deviceID = userAgent + " " + currentTime;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'User Not Found' });
        }

        if (user.role === "admin") {
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
        } else {
            if (password !== user.password) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
        }

        user.loggedInDevice.push({
            deviceID,
        })
        await user.save();

        const payload = {
            loggedInDevice: deviceID,
            id: user._id,
            role: user.role
        }


        const token = jwt.sign(payload, secretKey);
        res.status(200).json({
            id: user._id.toString(),
            role: user.role,
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.get(`/loggedInDevices/:id`, verify, async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(404).json({ error: "User Not Found" })
        }
        res.status(200).json(user.loggedInDevice)
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.delete(`/removeLoggedInDevice/:id/:deviceId`, verify, async (req, res) => {
    const { id, deviceId } = req.params;

    try {
        const user = await User.findOne({ _id: id, "loggedInDevice._id": deviceId })

        if (!user) {
            return res.status(404).json({ message: 'User not found with the specified device' });
        }
        user.loggedInDevice.pull({ _id: deviceId })

        await user.save();

        res.json({ message: "Session Removed Successfully" })

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Server Error" })
    }
})

module.exports = router;
