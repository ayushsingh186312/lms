const Joi = require('joi');

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    next();
  };
};

// Query validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors
      });
    }
    
    next();
  };
};

// Validation schemas
const schemas = {
  // User schemas
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('student', 'admin').optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    profile: Joi.object({
      avatar: Joi.string().uri().optional(),
      bio: Joi.string().max(500).optional(),
      phone: Joi.string().optional()
    }).optional()
  }),

  // Course schemas
  createCourse: Joi.object({
    title: Joi.string().min(5).max(100).required(),
    description: Joi.string().min(20).max(2000).required(),
    instructor: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().optional(),
      bio: Joi.string().optional()
    }).required(),
    price: Joi.number().min(0).required(),
    thumbnail: Joi.string().uri().optional(),
    category: Joi.string().valid('programming', 'design', 'business', 'marketing', 'photography', 'music', 'other').required(),
    level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    duration: Joi.object({
      hours: Joi.number().min(0).optional(),
      minutes: Joi.number().min(0).max(59).optional()
    }).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    requirements: Joi.array().items(Joi.string()).optional(),
    whatYouWillLearn: Joi.array().items(Joi.string()).optional()
  }),

  updateCourse: Joi.object({
    title: Joi.string().min(5).max(100).optional(),
    description: Joi.string().min(20).max(2000).optional(),
    instructor: Joi.object({
      name: Joi.string().optional(),
      email: Joi.string().email().optional(),
      bio: Joi.string().optional()
    }).optional(),
    price: Joi.number().min(0).optional(),
    thumbnail: Joi.string().uri().optional(),
    category: Joi.string().valid('programming', 'design', 'business', 'marketing', 'photography', 'music', 'other').optional(),
    level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    duration: Joi.object({
      hours: Joi.number().min(0).optional(),
      minutes: Joi.number().min(0).max(59).optional()
    }).optional(),
    isPublished: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    requirements: Joi.array().items(Joi.string()).optional(),
    whatYouWillLearn: Joi.array().items(Joi.string()).optional()
  }),

  // Lesson schemas
  createLesson: Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(1000).optional(),
    videoUrl: Joi.string().uri().required(),
    duration: Joi.number().min(0).optional(),
    order: Joi.number().min(1).required(),
    resources: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        url: Joi.string().uri().required(),
        type: Joi.string().valid('document', 'website', 'download', 'other').optional()
      })
    ).optional(),
    content: Joi.string().max(5000).optional(),
    isPreview: Joi.boolean().optional()
  }),

  updateLesson: Joi.object({
    title: Joi.string().min(3).max(100).optional(),
    description: Joi.string().max(1000).optional(),
    videoUrl: Joi.string().uri().optional(),
    duration: Joi.number().min(0).optional(),
    order: Joi.number().min(1).optional(),
    resources: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        url: Joi.string().uri().required(),
        type: Joi.string().valid('document', 'website', 'download', 'other').optional()
      })
    ).optional(),
    content: Joi.string().max(5000).optional(),
    isPreview: Joi.boolean().optional()
  }),

  // Quiz schemas
  createQuiz: Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(1000).optional(),
    questions: Joi.array().items(
      Joi.object({
        text: Joi.string().min(10).max(500).required(),
        options: Joi.array().items(
          Joi.object({
            text: Joi.string().required(),
            isCorrect: Joi.boolean().required()
          })
        ).min(2).max(6).required(),
        explanation: Joi.string().max(1000).optional(),
        points: Joi.number().min(0).optional()
      })
    ).min(1).required(),
    timeLimit: Joi.number().min(0).optional(),
    passingScore: Joi.number().min(0).max(100).optional(),
    maxAttempts: Joi.number().min(0).optional(),
    order: Joi.number().min(1).optional()
  }),

  updateQuiz: Joi.object({
    title: Joi.string().min(3).max(100).optional(),
    description: Joi.string().max(1000).optional(),
    questions: Joi.array().items(
      Joi.object({
        text: Joi.string().min(10).max(500).required(),
        options: Joi.array().items(
          Joi.object({
            text: Joi.string().required(),
            isCorrect: Joi.boolean().required()
          })
        ).min(2).max(6).required(),
        explanation: Joi.string().max(1000).optional(),
        points: Joi.number().min(0).optional()
      })
    ).min(1).optional(),
    timeLimit: Joi.number().min(0).optional(),
    passingScore: Joi.number().min(0).max(100).optional(),
    maxAttempts: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional(),
    order: Joi.number().min(1).optional()
  }),

  // Quiz attempt schema
  submitQuiz: Joi.object({
    answers: Joi.array().items(
      Joi.array().items(Joi.string())
    ).required(),
    timeSpent: Joi.number().min(0).optional()
  }),

  // Progress schemas
  updateLessonProgress: Joi.object({
    timeSpent: Joi.number().min(0).optional(),
    watchedPercentage: Joi.number().min(0).max(100).optional()
  }),

  // Query schemas
  paginationQuery: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    sort: Joi.string().optional(),
    search: Joi.string().optional(),
    category: Joi.string().optional(),
    level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    priceMin: Joi.number().min(0).optional(),
    priceMax: Joi.number().min(0).optional()
  })
};

module.exports = {
  validate,
  validateQuery,
  schemas
};