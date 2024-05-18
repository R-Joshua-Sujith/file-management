const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const directorySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    permissions: {
        canViewFiles: [Schema.Types.ObjectId],
        canAddFiles: [Schema.Types.ObjectId],
        canCommentFiles: [Schema.Types.ObjectId],
        canDeleteFiles: [Schema.Types.ObjectId],
        canDownloadFiles: [Schema.Types.ObjectId]
    },
}, {
    timestamps: true
});

const DirectoryModel = mongoose.model('Directory', directorySchema);

module.exports = DirectoryModel;
