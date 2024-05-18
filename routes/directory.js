const express = require("express");
const multer = require('multer');
const router = express.Router();
const FileModel = require('../models/File');
const User = require('../models/User');
const DirectoryModel = require("../models/Directory")
const fs = require('fs');
const path = require('path');
const { getFileSize } = require("../utils/fileSize");
const { verify, checkPermission, adminVerify } = require("./authMiddleware")

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const { directoryId } = req.body;
        const directoryPath = path.join(__dirname, '..', 'files', directoryId);

        // Check if the directory exists, if not, create it
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }

        cb(null, directoryPath);
    },
    filename: (req, file, cb) => {
        const { fileName } = req.body;
        cb(null, fileName);
    }
});

const upload = multer({ storage });

router.post('/create', adminVerify, async (req, res) => {
    try {
        const { name } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({ error: 'Directory name is required' });
        }

        const existingDirectory = await DirectoryModel.findOne({ name });

        if (existingDirectory) {
            return res.status(400).json({ error: "Directory with this name already exist" })
        }

        // Create the directory in the database
        const directory = new DirectoryModel({ name });
        await directory.save();

        // Create the directory on the server filesystem
        const directoryPath = path.join(__dirname, '..', 'files', directory._id.toString());
        fs.mkdirSync(directoryPath); // Create directory synchronously

        res.status(201).json({ message: "Directory Created Succesfully" });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error creating directory' });
    }
});

router.get('/get', verify, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let directories;

        if (user.role === 'admin') {
            // If the user is an admin, fetch all directories
            directories = await DirectoryModel.find();
        } else {
            // If the user is not an admin, fetch only directories where userId is in canViewFiles
            directories = await DirectoryModel.find({ 'permissions.canViewFiles': userId });
        }

        res.json(directories);
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error fetching directories' });
    }
});


router.delete('/:id', adminVerify, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the directory exists in the database
        const directory = await DirectoryModel.findById(id);
        if (!directory) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        // Remove the directory from the database
        await FileModel.deleteMany({ directoryId: id });

        await DirectoryModel.findByIdAndDelete(id);

        // Delete the directory from the server filesystem
        const directoryPath = path.join(__dirname, '..', 'files', id);
        fs.rm(directoryPath, { recursive: true }, (error) => {
            if (error) {
                console.error('Error deleting directory:', error);
            } else {
                console.log('Directory deleted successfully');
            }
        });

        res.json({ message: 'Directory deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting directory' });
    }
});

router.post('/upload/:directoryId/:userId', verify, checkPermission("canAddFiles"),
    upload.single('file'), async (req, res) => {
        try {
            const { directoryId, uploadedBy, description, fileName } = req.body;
            const { file } = req;

            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // Check if the directory exists in the database
            const directory = await DirectoryModel.findById(directoryId);
            if (!directory) {
                return res.status(404).json({ error: 'Directory not found' });
            }

            // Save file metadata in the database
            const newFile = new FileModel({
                description: description,
                filetype: file.mimetype,
                size: getFileSize(file.size),
                directoryId: directoryId,
                uploadedBy: uploadedBy,
                filePath: path.join('files', directoryId, fileName)
            });

            await newFile.save();

            res.status(201).json({ message: "File Uploaded Successfully" });
        } catch (error) {
            res.status(500).json({ error: 'Error uploading file' });
        }
    });

router.get('/files/:directoryId/:userId', verify, checkPermission("canViewFiles"), async (req, res) => {
    try {
        const { directoryId } = req.params;

        // Check if the directory exists in the database
        const directory = await DirectoryModel.findById(directoryId);
        if (!directory) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        // Find all files that belong to the specified directory
        const files = await FileModel.find({ directoryId: directoryId }).sort({ updatedAt: -1 })

        res.status(200).json({
            directory,
            files
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching files' });
    }
});

router.get('/file/:fileId/:directoryId/:userId', verify, checkPermission("canViewFiles"), async (req, res) => {
    try {
        const { fileId } = req.params;

        // Find the file by ID and populate the necessary fields
        const file = await FileModel.findById(fileId)
            .populate('uploadedBy', 'username email role')
            .populate({
                path: 'comments.commentedBy',
                select: 'username email role'
            })
            .populate('directoryId', 'name');

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.status(200).json(file);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching file details' });
    }
});

router.post('/comment/:fileId/:directoryId/:userId', verify, checkPermission("canCommentFiles"), async (req, res) => {
    try {
        const { fileId } = req.params;
        const { text, commentedBy } = req.body;

        // Validate required fields
        if (!text || !commentedBy) {
            return res.status(400).json({ error: 'Text and commentedBy are required' });
        }

        // Find the file by ID
        const file = await FileModel.findById(fileId);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Find the user who commented
        const user = await User.findById(commentedBy);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Add the new comment to the file's comments array
        const newComment = {
            text,
            commentedBy: user._id,
        };
        file.comments.unshift(newComment);

        // Save the updated file document
        await file.save();

        res.status(201).json({ message: "Comment added successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error adding comment' });
    }
});

router.get('/download/:fileId/:directoryId/:userId', verify, checkPermission("canDownloadFiles"), async (req, res) => {
    try {
        const { fileId } = req.params;

        // Find the file by ID
        const file = await FileModel.findById(fileId);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }


        // Get the file path from the file document
        const filePath = path.join(__dirname, '..', file.filePath);

        // Check if the file exists on the server
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        // Set the Content-Disposition header to include the filename
        const fileName = path.basename(file.filePath);
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);


        // Send the file to the client for download
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).json({ error: 'Error Downloading file' });
            }
        });
    } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).json({ error: 'Error fetching file' });
    }
});

router.delete('/file/:fileId/:directoryId/:userId', verify, checkPermission("canDeleteFiles"), async (req, res) => {
    try {
        const { fileId } = req.params;

        // Find the file by ID
        const file = await FileModel.findById(fileId);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete the file from the server filesystem
        const filePath = path.join(__dirname, '..', file.filePath);
        fs.unlinkSync(filePath);

        // Remove the file from the database
        await FileModel.findByIdAndDelete(fileId);

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting file' });
    }
});


module.exports = router;