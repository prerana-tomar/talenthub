const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Creates and streams a notification to the recipient if they have enabled notifications for that type.
 * @param {Object} req Express request object (used to retrieve io instance via req.app.get('io'))
 * @param {Object} params Notification parameters
 * @param {string} params.recipient ObjectId of the recipient
 * @param {string} params.sender ObjectId of the sender
 * @param {string} params.type Notification type
 * @param {string} params.message Notification text message
 * @param {string} params.link Redirection link
 * @param {string} [params.relatedVideo] Optional related video ObjectId
 * @param {string} [params.relatedCompetition] Optional related competition ObjectId
 */
async function sendNotification(req, { recipient, sender, type, message, link, relatedVideo, relatedCompetition }) {
  try {
    // 1. Skip self-notifications (except for system approvals / wins / joins)
    if (recipient.toString() === sender.toString() && type !== 'upload_approved' && type !== 'competition_win' && type !== 'competition_join') {
      return null;
    }

    // 2. Fetch recipient profile to check preferences
    const user = await User.findById(recipient);
    if (!user) return null;

    // 3. Evaluate notification type preference toggle
    // Map backend type string to preference toggle keys
    let isEnabled = true;
    if (user.notificationSettings) {
      if (type === 'like' && user.notificationSettings.likes === false) isEnabled = false;
      if (type === 'comment' && user.notificationSettings.comments === false) isEnabled = false;
      if (type === 'follow' && user.notificationSettings.follows === false) isEnabled = false;
      if ((type === 'competition_win' || type === 'competition_join') && user.notificationSettings.competitions === false) isEnabled = false;
      if (type === 'upload_approved' && user.notificationSettings.uploads === false) isEnabled = false;
      if (type === 'message' && user.notificationSettings.messages === false) isEnabled = false;
    }

    if (!isEnabled) return null;

    // 4. Save notification to database
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      message,
      link,
      relatedVideo: relatedVideo || null,
      relatedCompetition: relatedCompetition || null
    });

    // Populate sender details (username, profilePic)
    const populated = await notification.populate('sender', 'username profilePic');

    // 5. Emit real-time Socket.io event if active
    const io = req.app.get('io');
    if (io) {
      io.to(recipient.toString()).emit('new_notification', populated);
    }

    return populated;
  } catch (err) {
    console.error('Error in sendNotification utility:', err);
    return null;
  }
}

module.exports = { sendNotification };
