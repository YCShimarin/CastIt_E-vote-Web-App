const { db, writeLog, getAdmin, getUserByUsername } = require('../services/dataService');
const { sendResponse } = require('../utils/responseHandler');

const submitFeedback = async (req, res) => {
    try {
        const { message, username } = req.body;

        if (!message || message.trim() === '' || !username) {
            return sendResponse(res, false, 'Message and username are required', {}, 400);
        }

        const user = await getUserByUsername(username);
        if (!user) {
            return sendResponse(res, false, 'User not found', {}, 404);
        }

        const newFeedback = {
            _id: Date.now().toString(),
            userId: user.username || user.idNumber,
            fullName: user.fullName || user.nama, // Support both during transition
            category: user.category || user.jurusan,
            message: message.trim(),
            reply: null,
            repliedBy: null,
            status: 'pending',
            createdAt: new Date().toISOString(),
            repliedAt: null
        };

        await db.feedbacks.insert(newFeedback);
        return sendResponse(res, true, 'Feedback submitted successfully', newFeedback);
    } catch (error) {
        console.error('Feedback submit error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

const getMyFeedbacks = async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return sendResponse(res, false, 'Username required', {}, 400);
        
        const feedbacks = await db.feedbacks.find({ userId: username }).sort({ createdAt: -1 });
        return sendResponse(res, true, 'Success', feedbacks);
    } catch (error) {
        console.error('Get feedbacks error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

const getAdminFeedbacks = async (req, res) => {
    try {
        const adminUsername = req.headers['x-admin-username'];
        if (!adminUsername) return sendResponse(res, false, 'Unauthorized', {}, 403);
        
        const admin = await getAdmin(adminUsername);
        if (!admin) return sendResponse(res, false, 'Unauthorized', {}, 403);

        let query = {};
        if (admin.role === 'admin_verificator') {
            query.category = admin.category || admin.jurusan;
        }

        const feedbacks = await db.feedbacks.find(query).sort({ createdAt: -1 });
        return sendResponse(res, true, 'Success', feedbacks);
    } catch (error) {
        console.error('Get admin feedbacks error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

const replyFeedback = async (req, res) => {
    try {
        const adminUsername = req.headers['x-admin-username'];
        if (!adminUsername) return sendResponse(res, false, 'Unauthorized', {}, 403);
        
        const admin = await getAdmin(adminUsername);
        if (!admin) return sendResponse(res, false, 'Unauthorized', {}, 403);

        const { feedbackId, replyMessage } = req.body;
        if (!feedbackId || !replyMessage || replyMessage.trim() === '') {
            return sendResponse(res, false, 'Feedback ID and Reply Message are required', {}, 400);
        }

        const feedback = await db.feedbacks.findOne({ _id: feedbackId });
        if (!feedback) {
            return sendResponse(res, false, 'Feedback not found', {}, 404);
        }

        // Check verification admin permissions
        if (admin.role === 'admin_verificator') {
            const adminCat = admin.category || admin.jurusan;
            if (feedback.category !== adminCat) {
                return sendResponse(res, false, `Unauthorized to reply to feedbacks from ${feedback.category}`, {}, 403);
            }
        }

        const updated = await db.feedbacks.update({ _id: feedbackId }, {
            $set: {
                reply: replyMessage.trim(),
                repliedBy: admin.username,
                status: 'replied',
                repliedAt: new Date().toISOString()
            }
        });

        await writeLog(admin.username, `Replied to feedback from ${feedback.fullName}`);
        return sendResponse(res, true, 'Reply sent successfully');
    } catch (error) {
        console.error('Reply feedback error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

module.exports = {
    submitFeedback,
    getMyFeedbacks,
    getAdminFeedbacks,
    replyFeedback
};
