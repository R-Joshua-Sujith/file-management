const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the comment schema
const commentSchema = new Schema({
    text: {
        type: String,
        required: true,
    },
    commentedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    commentedAt: {
        type: Date,
        default: Date.now,
    },
});

// Define the file schema
const fileSchema = new Schema({
    description: {
        type: String,
        required: true,
    },
    filetype: {
        type: String,
        required: true,
    },
    size: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true, // base64 encoded file data
    },
    directoryId: {
        type: Schema.Types.ObjectId,
        ref: 'Directory',
        required: true,
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    comments: [commentSchema], // array of comment subdocuments
}, {
    timestamps: true
});

module.exports = mongoose.model('File', fileSchema);