// Scheduling Agent
// Tracks deadlines and court dates, triggers reminders

class SchedulingAgent {
  constructor() {
    this.reminders = [];
  }

  async addDeadline(caseId, deadlineData) {
    try {
      console.log(`Scheduling Agent: Adding deadline for case ${caseId}`);

      const deadline = {
        caseId,
        ...deadlineData,
        id: Date.now().toString(),
        createdAt: new Date(),
      };

      this.reminders.push(deadline);

      // Schedule reminder check
      this.scheduleReminder(deadline);

      return deadline;
    } catch (error) {
      console.error('Error in Scheduling Agent:', error);
      throw error;
    }
  }

  async checkUpcomingDeadlines() {
    const now = new Date();
    const upcoming = this.reminders.filter(reminder => {
      const deadlineDate = new Date(reminder.date);
      const daysUntil = (deadlineDate - now) / (1000 * 60 * 60 * 24);
      return daysUntil <= 7 && daysUntil > 0 && !reminder.notified;
    });

    // Mock notifications - in production, send emails/SMS
    upcoming.forEach(reminder => {
      console.log(`REMINDER: Deadline approaching for case ${reminder.caseId}: ${reminder.description} on ${reminder.date}`);
      reminder.notified = true;
    });

    return upcoming;
  }

  scheduleReminder(deadline) {
    const deadlineDate = new Date(deadline.date);
    const now = new Date();
    const timeUntilDeadline = deadlineDate - now;

    if (timeUntilDeadline > 0) {
      setTimeout(() => {
        console.log(`DEADLINE ALERT: ${deadline.description} is due today for case ${deadline.caseId}`);
      }, timeUntilDeadline);
    }
  }

  async getUpcomingDeadlines() {
    return this.reminders.filter(reminder => {
      const deadlineDate = new Date(reminder.date);
      const now = new Date();
      return deadlineDate > now;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

module.exports = new SchedulingAgent();