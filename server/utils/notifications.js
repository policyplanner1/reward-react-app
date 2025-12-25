const moment = require('moment');

const notifications = {
  // Generate daily achievement notifications
  generateDailyNotifications: (user, todayStats, streak) => {
    const notifications = [];
    
    // Goal achievement notification
    if (todayStats.goal_achieved) {
      notifications.push({
        type: 'goal_achieved',
        title: 'Daily Goal Achieved! 🎉',
        message: `Congratulations! You've reached your daily step goal of ${user.daily_step_goal} steps.`,
        priority: 'high'
      });
    } else {
      const remaining = user.daily_step_goal - todayStats.total_steps;
      if (remaining > 0 && remaining <= 2000) {
        notifications.push({
          type: 'goal_reminder',
          title: 'Almost There! 💪',
          message: `You're only ${remaining} steps away from your daily goal!`,
          priority: 'medium'
        });
      }
    }
    
    // Streak notifications
    if (streak >= 3) {
      notifications.push({
        type: 'streak_milestone',
        title: 'Streak Alert! 🔥',
        message: `You're on a ${streak}-day streak! Keep it up!`,
        priority: 'medium'
      });
    }
    
    // New achievement notifications would be added here
    // based on achievement checks
    
    return notifications;
  },
  
  // Generate weekly summary notification
  generateWeeklySummary: (weeklyStats, previousWeekStats) => {
    const improvement = weeklyStats.totalSteps - (previousWeekStats?.totalSteps || 0);
    let message = `You walked ${helpers.formatNumber(weeklyStats.totalSteps)} steps this week.`;
    
    if (improvement > 0) {
      message += ` That's ${helpers.formatNumber(improvement)} more than last week! 📈`;
    } else if (improvement < 0) {
      message += ` Let's aim for more next week! 💪`;
    } else {
      message += ` Consistent work! Keep it up! 👍`;
    }
    
    return {
      type: 'weekly_summary',
      title: 'Weekly Summary 📊',
      message,
      priority: 'low'
    };
  },
  
  // Generate BMI change notification
  generateBMINotification: (currentBMI, previousBMI) => {
    const change = currentBMI - previousBMI;
    const absChange = Math.abs(change);
    
    if (absChange < 0.1) return null;
    
    const direction = change > 0 ? 'increased' : 'decreased';
    
    return {
      type: 'bmi_change',
      title: 'BMI Update 📊',
      message: `Your BMI has ${direction} by ${absChange.toFixed(1)}. ${change > 0 ? 'Keep an eye on it!' : 'Great progress!'}`,
      priority: 'medium'
    };
  },
  
  // Generate motivational messages
  generateMotivationalMessage: () => {
    const messages = [
      "Every step brings you closer to your goals! 🚶‍♂️",
      "Your future self will thank you for moving today! 💪",
      "Small steps lead to big changes! 🌟",
      "You're one step closer to a healthier you! 😊",
      "Keep moving, keep improving! 🏃‍♂️",
      "Your health is your wealth! Invest in it today! 💎",
      "Every journey begins with a single step! 🛣️",
      "You've got this! One step at a time! 👍"
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
};

module.exports = notifications;