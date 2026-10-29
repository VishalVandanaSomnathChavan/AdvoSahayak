const Activity = require('../models/Activity');

async function recordActivity(ownerId, caseId, type, message, connection) {
  try {
    await Activity.create({ ownerId, caseId, type, message }, connection);
  } catch (error) {
    console.error('Activity log could not be saved:', error.code || error.name);
  }
}

module.exports = recordActivity;
