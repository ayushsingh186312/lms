const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a course title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a course description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  instructor: {
    name: {
      type: String,
      required: [true, 'Please provide instructor name'],
      trim: true
    },
    email: String,
    bio: String
  },
  price: {
    type: Number,
    required: [true, 'Please provide a price'],
    min: [0, 'Price cannot be negative']
  },
  thumbnail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    enum: ['programming', 'design', 'business', 'marketing', 'photography', 'music', 'other']
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    hours: {
      type: Number,
      default: 0
    },
    minutes: {
      type: Number,
      default: 0
    }
  },
  lessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  quizzes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  }],
  enrollments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  tags: [String],
  requirements: [String],
  whatYouWillLearn: [String]
}, {
  timestamps: true
});

// Indexes for better query performance
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ isPublished: 1 });

// Virtual for enrollment count
courseSchema.virtual('enrollmentCount').get(function() {
  return this.enrollments.length;
});

// Virtual for lesson count
courseSchema.virtual('lessonCount').get(function() {
  return this.lessons.length;
});

// Virtual for quiz count
courseSchema.virtual('quizCount').get(function() {
  return this.quizzes.length;
});

// Ensure virtuals are included in JSON
courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

// Method to check if user is enrolled
courseSchema.methods.isUserEnrolled = function(userId) {
  return this.enrollments.some(enrollment => 
    enrollment.user.toString() === userId.toString()
  );
};

// Method to enroll user
courseSchema.methods.enrollUser = function(userId) {
  if (!this.isUserEnrolled(userId)) {
    this.enrollments.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Course', courseSchema);