const { body, param, query } = require('express-validator');

const validation = {
  // User validation rules
  userRegister: [
    body('username')
      .isLength({ min: 3, max: 100 })
      .withMessage('Username must be between 3 and 100 characters')
      .isAlphanumeric()
      .withMessage('Username can only contain letters and numbers'),
    
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    
    body('first_name')
      .isLength({ min: 1, max: 100 })
      .withMessage('First name is required'),
    
    body('last_name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name is required'),
    
    body('gender')
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),
    
    body('date_of_birth')
      .isDate()
      .withMessage('Valid date of birth is required'),
    
    body('height_cm')
      .isFloat({ min: 50, max: 250 })
      .withMessage('Height must be between 50 and 250 cm'),
    
    body('weight_kg')
      .isFloat({ min: 20, max: 300 })
      .withMessage('Weight must be between 20 and 300 kg'),
    
    body('fitness_goal')
      .isIn(['weight_loss', 'weight_gain', 'healthy_living'])
      .withMessage('Fitness goal must be weight_loss, weight_gain, or healthy_living'),
    
    body('daily_step_goal')
      .optional()
      .isInt({ min: 1000, max: 50000 })
      .withMessage('Daily step goal must be between 1000 and 50000')
  ],

  // Step sync validation
  stepSync: [
    body('steps')
      .isInt({ min: 0, max: 100000 })
      .withMessage('Steps must be between 0 and 100,000'),
    
    body('date')
      .optional()
      .isDate()
      .withMessage('Valid date is required'),
    
    body('distance_km')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Distance must be between 0 and 100 km'),
    
    body('calories_burned')
      .optional()
      .isFloat({ min: 0, max: 5000 })
      .withMessage('Calories must be between 0 and 5000'),
    
    body('active_minutes')
      .optional()
      .isInt({ min: 0, max: 1440 })
      .withMessage('Active minutes must be between 0 and 1440')
  ],

  // BMI calculation validation
  bmiCalculate: [
    body('weight_kg')
      .isFloat({ min: 20, max: 300 })
      .withMessage('Weight must be between 20 and 300 kg'),
    
    body('height_cm')
      .isFloat({ min: 50, max: 250 })
      .withMessage('Height must be between 50 and 250 cm')
  ],

  // Goal creation validation
  goalCreate: [
    body('goal_type')
      .isIn(['daily_steps', 'weight_loss', 'weight_gain', 'maintenance'])
      .withMessage('Invalid goal type'),
    
    body('target_value')
      .isFloat({ min: 0 })
      .withMessage('Target value must be a positive number'),
    
    body('end_date')
      .optional()
      .isDate()
      .withMessage('Valid end date is required'),
    
    body('coins_on_completion')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Coins must be a positive integer')
  ],

  // Query parameter validation
  queryParams: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('year')
      .optional()
      .isInt({ min: 2000, max: 2100 })
      .withMessage('Year must be between 2000 and 2100'),
    
    query('month')
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('Month must be between 1 and 12'),
    
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],

  // ID parameter validation
  idParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID must be a positive integer')
  ],

  // Custom validation: check if date is not in future
  notFutureDate: (field) => {
    return body(field).custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error(`${field} cannot be in the future`);
      }
      return true;
    });
  },

  // Custom validation: check if end date is after start date
  endDateAfterStart: (endField, startField) => {
    return body(endField).custom((value, { req }) => {
      if (value && req.body[startField] && new Date(value) <= new Date(req.body[startField])) {
        throw new Error(`${endField} must be after ${startField}`);
      }
      return true;
    });
  }
};

module.exports = validation;