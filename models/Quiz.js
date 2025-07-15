const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Please provide question text'],
    trim: true,
    maxlength: [500, 'Question text cannot exceed 500 characters']
  },
  options: [{
    text: {
      type: String,
      required: [true, 'Please provide option text'],
      trim: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  explanation: {
    type: String,
    maxlength: [1000, 'Explanation cannot exceed 1000 characters']
  },
  points: {
    type: Number,
    default: 1,
    min: [0, 'Points cannot be negative']
  }
}, {
  _id: true
});

// Ensure at least one correct answer
questionSchema.pre('save', function(next) {
  const hasCorrectAnswer = this.options.some(option => option.isCorrect);
  if (!hasCorrectAnswer) {
    return next(new Error('Each question must have at least one correct answer'));
  }
  next();
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a quiz title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Quiz must belong to a course']
  },
  questions: [questionSchema],
  timeLimit: {
    type: Number, // Time limit in minutes
    default: 0 // 0 means no time limit
  },
  passingScore: {
    type: Number,
    default: 70, // Percentage
    min: [0, 'Passing score cannot be negative'],
    max: [100, 'Passing score cannot exceed 100']
  },
  maxAttempts: {
    type: Number,
    default: 0 // 0 means unlimited attempts
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes for better query performance
quizSchema.index({ course: 1, order: 1 });

// Virtual for total points
quizSchema.virtual('totalPoints').get(function() {
  return this.questions.reduce((total, question) => total + question.points, 0);
});

// Virtual for question count
quizSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

// Ensure virtuals are included in JSON
quizSchema.set('toJSON', { virtuals: true });
quizSchema.set('toObject', { virtuals: true });

// Method to calculate score
quizSchema.methods.calculateScore = function(answers) {
  let correctAnswers = 0;
  let totalPoints = 0;
  let earnedPoints = 0;

  this.questions.forEach((question, index) => {
    totalPoints += question.points;
    
    if (answers[index]) {
      const selectedOptionIds = Array.isArray(answers[index]) ? answers[index] : [answers[index]];
      const correctOptionIds = question.options
        .filter(option => option.isCorrect)
        .map(option => option._id.toString());
      
      // Check if all selected answers are correct and all correct answers are selected
      const isCorrect = selectedOptionIds.length === correctOptionIds.length &&
        selectedOptionIds.every(id => correctOptionIds.includes(id.toString()));
      
      if (isCorrect) {
        correctAnswers++;
        earnedPoints += question.points;
      }
    }
  });

  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  
  return {
    correctAnswers,
    totalQuestions: this.questions.length,
    earnedPoints,
    totalPoints,
    percentage,
    passed: percentage >= this.passingScore
  };
};

// Method to get questions without correct answers (for taking quiz)
quizSchema.methods.getQuestionsForTaking = function() {
  return this.questions.map(question => ({
    _id: question._id,
    text: question.text,
    options: question.options.map(option => ({
      _id: option._id,
      text: option.text
    })),
    points: question.points
  }));
};

module.exports = mongoose.model('Quiz', quizSchema);