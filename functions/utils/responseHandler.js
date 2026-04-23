const sendResponse = (res, success, message, data = {}, status = 200) => {
    return res.status(status).json({
        success,
        message,
        data
    });
};

module.exports = { sendResponse };
