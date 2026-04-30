const moment = require('moment');
const db = require('../config/database');

const helpers = {
  // Generate random color for charts
  generateRandomColor: () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  },

  // Format date for display
  formatDate: (date, format = 'DD MMM YYYY') => {
    return moment(date).format(format);
  },

  // Format time for display
  formatTime: (time, format = 'HH:mm') => {
    return moment(time, 'HH:mm:ss').format(format);
  },

  // Get day name from date
  getDayName: (date) => {
    return moment(date).format('dddd');
  },

  // Get short day name
  getShortDayName: (date) => {
    return moment(date).format('ddd');
  },

  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate date format (YYYY-MM-DD)
  isValidDate: (dateString) => {
    return moment(dateString, 'YYYY-MM-DD', true).isValid();
  },

  // Calculate age from birth date
  calculateAge: (birthDate) => {
    return moment().diff(moment(birthDate), 'years');
  },

  // Sanitize user input
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>&"']/g, '');
  },

  // Generate achievement description based on type
  generateAchievementDescription: (achievement) => {
    const { achievement_type, requirement_type, requirement_value } = achievement;
    
    const descriptions = {
      streak_keeper: `Maintain ${requirement_value} consecutive days of step goal`,
      trailblazer: `Walk ${helpers.formatNumber(requirement_value)} steps in a week`,
      sunrise_strider: `Complete morning walks for ${requirement_value} days`,
      step_milestone: `Reach ${helpers.formatNumber(requirement_value)} total steps`,
      consistency: `Achieve monthly goal for ${requirement_value} months`
    };
    
    return descriptions[achievement_type] || achievement.description;
  },

  // Format large numbers with commas
  formatNumber: (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  // Convert kg to lbs
  kgToLbs: (kg) => {
    return parseFloat((kg * 2.20462).toFixed(1));
  },

  // Convert cm to feet and inches
  cmToFeetInches: (cm) => {
    const inches = cm * 0.393701;
    const feet = Math.floor(inches / 12);
    const remainingInches = Math.round(inches % 12);
    
    return `${feet}'${remainingInches}"`;
  },

  // Get greeting based on time of day
  getGreeting: () => {
    const hour = moment().hour();
    
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  },

  // Generate motivational message based on progress
  getMotivationalMessage: (progress, goal) => {
    const percentage = (progress / goal) * 100;
    
    if (percentage >= 100) {
      return "Amazing! You've crushed your goal! 🎉";
    } else if (percentage >= 80) {
      return "You're so close! Almost there! 💪";
    } else if (percentage >= 50) {
      return "Great progress! Keep going! 😊";
    } else if (percentage >= 25) {
      return "Good start! You can do this! 👍";
    } else {
      return "Every step counts! Let's get moving! 🚶‍♂️";
    }
  },

  // Calculate achievement progress
  calculateAchievementProgress: (userAchievements) => {
    const total = userAchievements.length;
    const achieved = userAchievements.filter(a => a.achieved_date).length;
    const claimed = userAchievements.filter(a => a.is_claimed).length;
    const inProgress = userAchievements.filter(a => !a.achieved_date && a.progress_value > 0).length;
    
    return {
      total,
      achieved,
      claimed,
      inProgress,
      achievementRate: total > 0 ? Math.round((achieved / total) * 100) : 0
    };
  },

  // Generate chart data from steps data
  generateChartData: (stepsData, type = 'weekly') => {
    if (!stepsData || stepsData.length === 0) {
      return { labels: [], datasets: [] };
    }

    let labels = [];
    let data = [];

    if (type === 'weekly') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
        const dayData = stepsData.find(d => d.step_date === date);
        labels.push(moment(date).format('ddd'));
        data.push(dayData ? dayData.total_steps : 0);
      }
    } else if (type === 'monthly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const startDate = moment().subtract(i * 7 + 6, 'days').format('YYYY-MM-DD');
        const endDate = moment().subtract(i * 7, 'days').format('YYYY-MM-DD');
        const weekData = stepsData.filter(d => 
          d.step_date >= startDate && d.step_date <= endDate
        );
        const weekSteps = weekData.reduce((sum, day) => sum + (day.total_steps || 0), 0);
        labels.push(`Week ${4 - i}`);
        data.push(weekSteps);
      }
    } else if (type === 'hourly') {
      // Today's hourly data
      labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      data = Array(24).fill(0);
      
      const todayData = stepsData.find(d => 
        d.step_date === moment().format('YYYY-MM-DD')
      );
      
      if (todayData && todayData.hourly_data) {
        // Assuming hourly_data is an array of 24 values
        data = todayData.hourly_data;
      }
    }

    return {
      labels,
      datasets: [
        {
          label: 'Steps',
          data,
          backgroundColor: '#4CAF50',
          borderColor: '#45a049',
          borderWidth: 2
        }
      ]
    };
  },

  // Calculate health score based on various factors
  calculateHealthScore: (userData, recentSteps, bmiData) => {
    let score = 50; // Base score

    // Activity level (max 30 points)
    const avgSteps = recentSteps.reduce((sum, day) => sum + day.total_steps, 0) / recentSteps.length;
    if (avgSteps >= 10000) score += 30;
    else if (avgSteps >= 7500) score += 20;
    else if (avgSteps >= 5000) score += 10;
    else if (avgSteps >= 3000) score += 5;

    // BMI score (max 20 points)
    if (bmiData) {
      const bmiCategory = bmiData.bmi_category;
      if (bmiCategory === 'normal') score += 20;
      else if (bmiCategory === 'overweight') score += 10;
      else if (bmiCategory === 'underweight') score += 5;
    }

    // Consistency (max 20 points)
    const goalDays = recentSteps.filter(day => day.goal_achieved).length;
    const consistency = goalDays / recentSteps.length;
    score += Math.round(consistency * 20);

    // Streak bonus (max 10 points)
    const currentStreak = helpers.calculateCurrentStreak(recentSteps);
    score += Math.min(10, currentStreak);

    return Math.min(100, Math.max(0, score));
  },

  // Generate summary text based on health score
  getHealthSummary: (score) => {
    if (score >= 90) return "Excellent! You're doing amazing! 🌟";
    if (score >= 80) return "Great job! You're very healthy! 👍";
    if (score >= 70) return "Good work! Keep it up! 😊";
    if (score >= 60) return "Not bad! Room for improvement. 💪";
    if (score >= 50) return "Okay, but you can do better! 🚶‍♂️";
    return "Time to get active! Your health is important! 🏃‍♂️";
  },

  // Log activity for debugging
  logActivity: (userId, activity, details = {}) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] User ${userId}: ${activity}`, details);
  },

  // Handle database errors consistently
  handleDatabaseError: (error, res) => {
    console.error('Database error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Duplicate entry' });
    } else if (error.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ error: 'Invalid reference' });
    } else {
      return res.status(500).json({ error: 'Database error' });
    }
  }
};

module.exports = helpers;