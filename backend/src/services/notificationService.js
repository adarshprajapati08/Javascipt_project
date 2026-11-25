const Notification = require('../models/Notification');

const createNotification = async ({
  recipient,
  title,
  message,
  type = 'system',
  relatedEntity = null,
}) => {
  try {
    if (!recipient) return null;
    return await Notification.create({
      recipient,
      title,
      message,
      type,
      relatedEntity,
    });
  } catch (err) {
    console.error('[NotificationService Error]:', err.message);
    return null;
  }
};

module.exports = { createNotification };
