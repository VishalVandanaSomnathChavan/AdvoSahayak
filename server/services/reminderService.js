function buildReminders(cases, tasks, now, days) {
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const reminders = [];

  for (const matter of cases) {
    for (const deadline of matter.deadlines || []) {
      if (deadline.completed || deadline.confidence === 'uncertain') continue;
      const date = new Date(deadline.date);
      if (date <= until) {
        reminders.push({
          id: `deadline-${matter._id}-${deadline._id}`,
          type: 'deadline',
          caseId: matter._id,
          caseTitle: matter.title,
          title: deadline.description,
          date,
          overdue: date < now,
        });
      }
    }

    for (const hearing of matter.hearings || []) {
      const date = new Date(hearing.date);
      if (date >= now && date <= until) {
        reminders.push({
          id: `hearing-${matter._id}-${hearing._id}`,
          type: 'hearing',
          caseId: matter._id,
          caseTitle: matter.title,
          title: hearing.description,
          date,
          overdue: false,
        });
      }
    }
  }

  for (const task of tasks) {
    reminders.push({
      id: `task-${task._id}`,
      type: 'task',
      caseId: task.case?._id,
      caseTitle: task.case?.title || 'Case',
      title: task.title,
      date: task.dueDate,
      overdue: new Date(task.dueDate) < now,
    });
  }

  return reminders.sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = { buildReminders };
