const getFileSize = (fileSize) => {
    // Define the size limits
    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;

    // Check the size range and return the corresponding standardized size
    if (fileSize >= GB) {
        return `${(fileSize / GB).toFixed(2)} GB`;
    } else if (fileSize >= MB) {
        return `${(fileSize / MB).toFixed(2)} MB`;
    } else if (fileSize >= KB) {
        return `${(fileSize / KB).toFixed(2)} KB`;
    } else {
        return `${fileSize} bytes`;
    }
}


module.exports = { getFileSize }