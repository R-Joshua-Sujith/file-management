const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const secretKey = process.env.JWT_SECRET_KEY;
const User = require('../models/User');
const DirectoryModel = require("../models/Directory")


const adminVerify = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(" ")[1];
        jwt.verify(token, secretKey, async (err, user) => {
            if (err) {
                return res.status(401).json({ error: "Token is not valid", action: "logout" });
            }
            req.user = user;

            // Check if the user is an admin
            if (user.role !== 'admin') {
                return res.status(403).json({ error: "Access Denied", action: "logout" });
            }

            try {
                // Find the admin document by email
                const existingUser = await User.findOne({ _id: user.id });
                if (!existingUser) {
                    return res.status(401).json({ error: "User Not Found", action: "logout" });
                }

                if (existingUser?.role !== "admin") {
                    return res.status(403).json({ error: "Access Denied", action: "logout" });
                }

                // Check if the request user's device is present in the admin's loggedInDevice array
                const userDevice = user.loggedInDevice;
                const deviceExists = existingUser.loggedInDevice.some(device => device.deviceID === userDevice);

                if (!deviceExists) {
                    return res.status(401).json({ error: "Session Expired", action: "logout" });
                }

                next();
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    } else {
        res.status(400).json({ error: "You are not authenticated", action: "logout" });
    }
}

const verify = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(" ")[1];
        jwt.verify(token, secretKey, async (err, user) => {
            if (err) {
                return res.status(401).json({ error: "Session Expired", action: "logout" });
            }
            req.user = user;


            try {
                // Find the admin document by email
                const existingUser = await User.findOne({ _id: user.id });
                if (!existingUser) {
                    return res.status(401).json({ error: "User Not Found", action: "logout" });
                }

                // Check if the request user's device is present in the admin's loggedInDevice array
                const userDevice = user.loggedInDevice;
                const deviceExists = existingUser.loggedInDevice.some(device => device.deviceID === userDevice);

                if (!deviceExists) {
                    return res.status(401).json({ error: "Session Expired", action: "logout" });
                }

                next();
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    } else {
        res.status(400).json({ error: "You are not authenticated", action: "logout" });
    }
}

const checkPermission = (permissionType) => async (req, res, next) => {
    const { userId } = req.params; // assuming userId is sent in the request body
    const { directoryId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found', action: "logout" });
        }

        if (user.role === 'admin') {
            return next();
        }

        const directory = await DirectoryModel.findById(directoryId);
        if (!directory) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        if (!directory.permissions[permissionType].includes(userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        next();
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal Server Errorr' });
    }
};


module.exports = { verify, checkPermission, adminVerify };