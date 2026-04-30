const moment = require('moment');

const calculations = {
  // Calculate distance in kilometers based on steps
  calculateDistance: (steps, strideLength = 0.0008) => {
    return parseFloat((steps * strideLength).toFixed(2));
  },

  // Calculate calories burned based on steps, weight, and height
  calculateCalories: (steps, weightKg, heightCm, age, gender) => {
    // MET (Metabolic Equivalent of Task) for walking
    const met = 3.5;
    const weightLbs = weightKg * 2.20462;
    const heightInches = heightCm * 0.393701;
    
    // BMR calculation (Mifflin-St Jeor Equation)
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
    
    // Calories burned = BMR * MET * time in hours
    // Assuming average walking speed of 5 km/h
    const timeHours = (steps * 0.0008) / 5; // distance / speed
    const calories = (bmr / 24) * met * timeHours;
    
    return Math.max(0, Math.round(calories));
  },

  // Calculate active minutes based on steps
  calculateActiveMinutes: (steps) => {
    // Assuming 100 steps per minute for moderate walking
    return Math.floor(steps / 100);
  },

  // Calculate coins earned based on steps and goal achievement
  calculateCoins: (steps, goalAchieved, dailyGoal = 10000) => {
    let coins = Math.floor(steps / 1000); // 1 coin per 1000 steps
    
    // Bonus coins for achieving daily goal
    if (goalAchieved) {
      coins += 10; // 10 bonus coins for achieving goal
    }
    
    // Extra bonus for exceeding goal significantly
    if (steps >= dailyGoal * 1.5) {
      coins += 5; // 5 extra coins for 150% of goal
    }
    
    return coins;
  },

  // Calculate BMI
  calculateBMI: (weightKg, heightCm) => {
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
  },

  // Get BMI category
  getBMICategory: (bmi) => {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
  },

  // Suggest daily steps based on BMI and fitness goal
  suggestDailySteps: (bmi, fitnessGoal, currentSteps = 0) => {
    let baseSteps;
    
    // Base steps based on BMI category
    switch (calculations.getBMICategory(bmi)) {
      case 'underweight':
        baseSteps = 8000; // Moderate activity
        break;
      case 'normal':
        baseSteps = 10000; // Standard recommendation
        break;
      case 'overweight':
        baseSteps = 12000; // Increased activity
        break;
      case 'obese':
        baseSteps = 15000; // High activity
        break;
      default:
        baseSteps = 10000;
    }
    
    // Adjust based on fitness goal
    switch (fitnessGoal) {
      case 'weight_loss':
        baseSteps += 2000;
        break;
      case 'weight_gain':
        baseSteps -= 2000;
        break;
      case 'healthy_living':
        // Keep base steps
        break;
      default:
        baseSteps = 10000;
    }
    
    // Consider current activity level
    if (currentSteps > 0) {
      const adjustment = Math.min(2000, Math.max(-2000, (currentSteps - baseSteps) / 2));
      baseSteps += adjustment;
    }
    
    return Math.max(3000, Math.min(20000, Math.round(baseSteps / 500) * 500)); // Round to nearest 500
  },

  // Calculate weekly progress
  calculateWeeklyProgress: (dailyData) => {
    const weeklyStats = {
      totalSteps: 0,
      totalDistance: 0,
      totalCalories: 0,
      totalActiveMinutes: 0,
      totalCoins: 0,
      goalDays: 0,
      averageSteps: 0
    };

    if (dailyData.length === 0) return weeklyStats;

    dailyData.forEach(day => {
      weeklyStats.totalSteps += day.total_steps || 0;
      weeklyStats.totalDistance += day.distance_km || 0;
      weeklyStats.totalCalories += day.calories_burned || 0;
      weeklyStats.totalActiveMinutes += day.active_minutes || 0;
      weeklyStats.totalCoins += day.coins_earned || 0;
      if (day.goal_achieved) weeklyStats.goalDays++;
    });

    weeklyStats.averageSteps = Math.round(weeklyStats.totalSteps / dailyData.length);
    
    return weeklyStats;
  },

  // Calculate streak
  calculateCurrentStreak: (dailyData) => {
    if (!dailyData || dailyData.length === 0) return 0;
    
    // Sort by date descending
    const sortedData = dailyData.sort((a, b) => 
      new Date(b.step_date) - new Date(a.step_date)
    );
    
    let streak = 0;
    let currentDate = moment();
    
    for (let i = 0; i < sortedData.length; i++) {
      const record = sortedData[i];
      const recordDate = moment(record.step_date);
      
      // Check if this record is for the expected date and goal was achieved
      if (recordDate.isSame(currentDate, 'day') && record.goal_achieved) {
        streak++;
        currentDate.subtract(1, 'day');
      } else if (i === 0 && !recordDate.isSame(currentDate, 'day')) {
        // First record is not from today, streak is 0
        break;
      } else {
        // Streak broken
        break;
      }
    }
    
    return streak;
  },

  // Calculate progress percentage
  calculateProgress: (current, target) => {
    if (target === 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  },

  // Generate weekly date range
  getWeekDateRange: (date = new Date()) => {
    const startOfWeek = moment(date).startOf('week'); // Sunday
    const endOfWeek = moment(date).endOf('week');     // Saturday
    
    return {
      start: startOfWeek.format('YYYY-MM-DD'),
      end: endOfWeek.format('YYYY-MM-DD')
    };
  },

  // Generate monthly date range
  getMonthDateRange: (date = new Date()) => {
    const startOfMonth = moment(date).startOf('month');
    const endOfMonth = moment(date).endOf('month');
    
    return {
      start: startOfMonth.format('YYYY-MM-DD'),
      end: endOfMonth.format('YYYY-MM-DD')
    };
  },

  // Format duration for display
  formatDuration: (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  },

  // Format distance for display
  formatDistance: (km) => {
    if (km >= 1) {
      return `${km.toFixed(1)} km`;
    }
    return `${Math.round(km * 1000)} m`;
  },

  // Calculate pace (minutes per km)
  calculatePace: (steps, activeMinutes, distanceKm) => {
    if (distanceKm === 0) return 0;
    const pace = activeMinutes / distanceKm;
    return parseFloat(pace.toFixed(2));
  }
};

module.exports = calculations;