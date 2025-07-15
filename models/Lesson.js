const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a lesson title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  videoUrl: {
    type: String,
    required: [true, 'Please provide a video URL'],
    match: [
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
      'Please provide a valid URL'
    ]
  },
  duration: {
    type: Number, // Duration in minutes
    default: 0
  },
  order: {
    type: Number,
    required: [true, 'Please provide lesson order'],
    min: [1, 'Order must be at least 1']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Lesson must belong to a course']
  },
  resources: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      match: [
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
        'Please provide a valid URL'
      ]
    },
    type: {
      type: String,
      enum: ['document', 'website', 'download', 'other'],
      default: 'document'
    }
  }],
  content: {
    type: String, // Optional text content/notes for the lesson
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  isPreview: {
    type: Boolean,
    default: false // If true, lesson can be viewed without enrollment
  }
}, {
  timestamps: true
});

// Indexes for better query performance
lessonSchema.index({ course: 1, order: 1 });

// Ensure order is unique within a course
lessonSchema.index({ course: 1, order: 1 }, { unique: true });

// Virtual to check if lesson is accessible
lessonSchema.virtual('isAccessible').get(function() {
  return this.isPreview;
});

// Method to get next lesson in the course
lessonSchema.methods.getNextLesson = async function() {
  return await this.constructor.findOne({
    course: this.course,
    order: { $gt: this.order }
  }).sort({ order: 1 });
};

// Method to get previous lesson in the course
lessonSchema.methods.getPreviousLesson = async function() {
  return await this.constructor.findOne({
    course: this.course,
    order: { $lt: this.order }
  }).sort({ order: -1 });
};

module.exports = mongoose.model('Lesson', lessonSchema);