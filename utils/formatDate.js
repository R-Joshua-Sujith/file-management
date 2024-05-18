const formatDate = (date) => {
    const options = {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: 'numeric',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };

    const formattedDate = new Date(date).toLocaleString('en-IN', options);
    return formattedDate;
}

module.exports = { formatDate }