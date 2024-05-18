const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DirectoryModel = require("../models/Directory")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv");
const { verify, adminVerify, checkPermission } = require("./authMiddleware")
const { formatDate } = require("../utils/formatDate")
dotenv.config();
const secretKey = process.env.JWT_SECRET_KEY;


router.post("/create-user", adminVerify, async (req, res) => {
    try {
        let { username, password, email } = req.body;
        username = username.trim().toLowerCase();
        email = email.trim().toLowerCase();
        if (!username || !password || !email) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if the username or email is already taken
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const normalUser = new User({ username, password, email, role: "user" })
        await normalUser.save()

        res.status(200).json({ message: "User Created Successfully" })
    }
    catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
})

router.get('/get-all-users', adminVerify, async (req, res) => {
    try {
        const { page = 1, pageSize = 5, search = '' } = req.query;
        const skip = (page - 1) * pageSize;

        const searchRegex = new RegExp(search, 'i');

        const query = {
            role: "user",
            $or: [
                { 'email': searchRegex },
                { 'username': searchRegex },


            ],
        };

        const allUsers = await User.find(query)
            .sort({ createdAt: -1 }) // Sort by createdAt field in descending order
            .skip(skip)
            .limit(parseInt(pageSize));

        const formattedUsers = allUsers.map((user) => {
            const formattedDate = formatDate(user.createdAt);
            return { ...user._doc, createdAt: formattedDate };
        });

        const totalUsers = await User.countDocuments(query);

        res.status(200).json({
            totalRows: totalUsers,
            data: formattedUsers
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/user-directories/:userId', adminVerify, async (req, res) => {
    try {
        const userId = req.params.userId; // Assuming `verify` middleware attaches user info to req.user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const directories = await DirectoryModel.find().sort({ createdAt: -1 });

        const userPermissions = directories.map(directory => {
            return {
                directoryId: directory._id,
                directoryName: directory.name,
                canViewFiles: directory.permissions.canViewFiles.includes(userId),
                canAddFiles: directory.permissions.canAddFiles.includes(userId),
                canCommentFiles: directory.permissions.canCommentFiles.includes(userId),
                canDeleteFiles: directory.permissions.canDeleteFiles.includes(userId),
                canDownloadFiles: directory.permissions.canDownloadFiles.includes(userId)
            };
        });

        res.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                password: user.password
            },
            directories: userPermissions
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error fetching user directories and permissions' });
    }
});


router.put('/directory/:directoryId/permissions', adminVerify, async (req, res) => {
    try {
        const { directoryId } = req.params;
        const { userId, permissionType } = req.body;

        const validPermissionTypes = [
            'canViewFiles',
            'canAddFiles',
            'canCommentFiles',
            'canDeleteFiles',
            'canDownloadFiles'
        ];

        if (!validPermissionTypes.includes(permissionType)) {
            return res.status(400).json({ error: 'Invalid permission type' });
        }

        const directory = await DirectoryModel.findById(directoryId);
        if (!directory) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        // Add the userId to the specified permission array if not already present
        if (!directory.permissions[permissionType].includes(userId)) {
            directory.permissions[permissionType].push(userId);
            await directory.save();
        }

        res.status(200).json({ message: 'Permission updated successfully' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error updating permissions' });
    }
});

router.put('/directory/:directoryId/permissions/remove', adminVerify, async (req, res) => {
    try {
        const { directoryId } = req.params;
        const { userId, permissionType } = req.body;

        const validPermissionTypes = [
            'canViewFiles',
            'canAddFiles',
            'canCommentFiles',
            'canDeleteFiles',
            'canDownloadFiles'
        ];

        if (!validPermissionTypes.includes(permissionType)) {
            return res.status(400).json({ error: 'Invalid permission type' });
        }

        const directory = await DirectoryModel.findById(directoryId);
        if (!directory) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        // Remove the userId from the specified permission array if present
        directory.permissions[permissionType] = directory.permissions[permissionType].filter(id => id.toString() !== userId);

        await directory.save();

        res.status(200).json({ message: 'Permission Removed Successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating permissions' });
    }
});



module.exports = router;
