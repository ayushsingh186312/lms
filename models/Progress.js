const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    selectedOptions: [{
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }]
  }],
  score: {
    correctAnswers: Number,
    totalQuestions: Number,
    earnedPoints: Number,
    totalPoints: Number,
    percentage: Number,
    passed: Boolean
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  timeSpent: {
    type: Number, // Time spent in minutes
    default: 0
  }
}, {
  _id: true,
  timestamps: true
});

const lessonProgressSchema = new mongoose.Schema({
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  timeSpent: {
    type: Number, // Time spent in minutes
    default: 0
  },
  watchedPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  _id: true
});

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Progress must belong to a user']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Progress must belong to a course']
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  lessonsProgress: [lessonProgressSchema],
  quizAttempts: [quizAttemptSchema],
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateIssuedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
progressSchema.index({ user: 1, course: 1 }, { unique: true });
progressSchema.index({ user: 1 });
progressSchema.index({ course: 1 });

// Virtual for completed lessons count
progressSchema.virtual('completedLessonsCount').get(function() {
  return this.lessonsProgress.filter(lesson => lesson.completed).length;
});

// Virtual for total quiz attempts
progressSchema.virtual('totalQuizAttempts').get(function() {
  return this.quizAttempts.length;
});

// Virtual for passed quizzes count
progressSchema.virtual('passedQuizzesCount').get(function() {
  const quizIds = new Set();
  this.quizAttempts.forEach(attempt => {
    if (attempt.score.passed) {
      quizIds.add(attempt.quiz.toString());
    }
  });
  return quizIds.size;
});

// Virtual for best quiz scores
progressSchema.virtual('bestQuizScores').get(function() {
  const quizScores = new Map();
  
  this.quizAttempts.forEach(attempt => {
    const quizId = attempt.quiz.toString();
    const currentBest = quizScores.get(quizId);
    
    if (!currentBest || attempt.score.percentage > currentBest.percentage) {
      quizScores.set(quizId, attempt.score);
    }
  });
  
  return Array.from(quizScores.entries()).map(([quizId, score]) => ({
    quiz: quizId,
    ...score
  }));
});

// Ensure virtuals are included in JSON
progressSchema.set('toJSON', { virtuals: true });
progressSchema.set('toObject', { virtuals: true });

// Method to mark lesson as completed
progressSchema.methods.completeLesson = function(lessonId, timeSpent = 0, watchedPercentage = 100) {
  const lessonProgress = this.lessonsProgress.find(
    lp => lp.lesson.toString() === lessonId.toString()
  );
  
  if (lessonProgress) {
    lessonProgress.completed = true;
    lessonProgress.completedAt = new Date();
    lessonProgress.timeSpent += timeSpent;
    lessonProgress.watchedPercentage = Math.max(lessonProgress.watchedPercentage, watchedPercentage);
  } else {
    this.lessonsProgress.push({
      lesson: lessonId,
      completed: true,
      completedAt: new Date(),
      timeSpent,
      watchedPercentage
    });
  }
  
  this.updateOverallProgress();
  return this.save();
};

// Method to update lesson progress (for video watching)
progressSchema.methods.updateLessonProgress = function(lessonId, timeSpent = 0, watchedPercentage = 0) {
  const lessonProgress = this.lessonsProgress.find(
    lp => lp.lesson.toString() === lessonId.toString()
  );
  
  if (lessonProgress) {
    lessonProgress.timeSpent += timeSpent;
    lessonProgress.watchedPercentage = Math.max(lessonProgress.watchedPercentage, watchedPercentage);
  } else {
    this.lessonsProgress.push({
      lesson: lessonId,
      timeSpent,
      watchedPercentage,
      completed: watchedPercentage >= 80 // Auto-complete if 80% watched
    });
  }
  
  this.updateOverallProgress();
  return this.save();
};

// Method to add quiz attempt
progressSchema.methods.addQuizAttempt = function(quizId, answers, score, timeSpent = 0) {
  this.quizAttempts.push({
    quiz: quizId,
    answers,
    score,
    completedAt: new Date(),
    timeSpent
  });
  
  this.updateOverallProgress();
  return this.save();
};

// Method to calculate and update overall progress
progressSchema.methods.updateOverallProgress = async function() {
  await this.populate(['course', 'lessonsProgress.lesson', 'quizAttempts.quiz']);
  
  const totalLessons = this.course.lessons.length;
  const totalQuizzes = this.course.quizzes.length;
  
  if (totalLessons === 0 && totalQuizzes === 0) {
    this.overallProgress = 0;
    return;
  }
  
  let completedItems = 0;
  let totalItems = 0;
  
  // Count lessons
  if (totalLessons > 0) {
    completedItems += this.completedLessonsCount;
    totalItems += totalLessons;
  }
  
  // Count passed quizzes
  if (totalQuizzes > 0) {
    completedItems += this.passedQuizzesCount;
    totalItems += totalQuizzes;
  }
  
  this.overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  // Mark course as completed if 100% progress
  if (this.overallProgress === 100 && !this.completedAt) {
    this.completedAt = new Date();
  }
};

// Method to get best score for a specific quiz
progressSchema.methods.getBestQuizScore = function(quizId) {
  const attempts = this.quizAttempts.filter(
    attempt => attempt.quiz.toString() === quizId.toString()
  );
  
  if (attempts.length === 0) return null;
  
  return attempts.reduce((best, current) => 
    current.score.percentage > best.score.percentage ? current : best
  );
};

// Method to get latest quiz attempt
progressSchema.methods.getLatestQuizAttempt = function(quizId) {
  const attempts = this.quizAttempts.filter(
    attempt => attempt.quiz.toString() === quizId.toString()
  );
  
  if (attempts.length === 0) return null;
  
  return attempts[attempts.length - 1];
};

module.exports = mongoose.model('Progress', progressSchema);