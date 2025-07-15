const express = require('express');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// @desc    Get lessons for a course
// @route   GET /api/lessons/course/:courseId
// @access  Public (limited for non-enrolled users)
router.get('/course/:courseId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    let lessons = await Lesson.find({ course: req.params.courseId })
      .sort({ order: 1 })
      .select('title description duration order isPreview videoUrl resources');

    // Filter lessons for non-enrolled users
    if (req.user) {
      const isEnrolled = course.isUserEnrolled(req.user.id);
      if (!isEnrolled && req.user.role !== 'admin') {
        lessons = lessons.filter(lesson => lesson.isPreview);
      }
    } else {
      lessons = lessons.filter(lesson => lesson.isPreview);
    }

    res.status(200).json({
      success: true,
      data: lessons
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching lessons'
    });
  }
});

// @desc    Get single lesson
// @route   GET /api/lessons/:id
// @access  Private (enrolled users only)
router.get('/:id', protect, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('course', 'title');
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const course = await Course.findById(lesson.course._id);
    
    // Check if user is enrolled or is admin
    if (req.user.role !== 'admin') {
      if (!lesson.isPreview && !course.isUserEnrolled(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to access this lesson'
        });
      }
    }

    // Get user's progress for this lesson
    let lessonProgress = null;
    if (course.isUserEnrolled(req.user.id)) {
      const progress = await Progress.findOne({
        user: req.user.id,
        course: lesson.course._id
      });
      
      if (progress) {
        lessonProgress = progress.lessonsProgress.find(
          lp => lp.lesson.toString() === lesson._id.toString()
        );
      }
    }

    // Get next and previous lessons
    const nextLesson = await lesson.getNextLesson();
    const previousLesson = await lesson.getPreviousLesson();

    res.status(200).json({
      success: true,
      data: {
        lesson,
        progress: lessonProgress,
        navigation: {
          nextLesson: nextLesson ? {
            _id: nextLesson._id,
            title: nextLesson.title,
            order: nextLesson.order
          } : null,
          previousLesson: previousLesson ? {
            _id: previousLesson._id,
            title: previousLesson.title,
            order: previousLesson.order
          } : null
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching lesson'
    });
  }
});

// @desc    Create new lesson
// @route   POST /api/lessons/:courseId
// @access  Private (Admin only)
router.post('/:courseId', protect, authorize('admin'), validate(schemas.createLesson), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const lessonData = {
      ...req.body,
      course: req.params.courseId
    };

    const lesson = await Lesson.create(lessonData);

    // Add lesson to course
    course.lessons.push(lesson._id);
    await course.save();

    res.status(201).json({
      success: true,
      data: lesson
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A lesson with this order already exists in this course'
      });
    }
    
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error creating lesson'
    });
  }
});

// @desc    Update lesson
// @route   PUT /api/lessons/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), validate(schemas.updateLesson), async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    res.status(200).json({
      success: true,
      data: lesson
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A lesson with this order already exists in this course'
      });
    }
    
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating lesson'
    });
  }
});

// @desc    Delete lesson
// @route   DELETE /api/lessons/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Remove lesson from course
    await Course.findByIdAndUpdate(
      lesson.course,
      { $pull: { lessons: lesson._id } }
    );

    // Remove lesson progress from all users
    await Progress.updateMany(
      { course: lesson.course },
      { $pull: { lessonsProgress: { lesson: lesson._id } } }
    );

    await lesson.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting lesson'
    });
  }
});

// @desc    Mark lesson as completed
// @route   POST /api/lessons/:id/complete
// @access  Private
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const { timeSpent = 0, watchedPercentage = 100 } = req.body;
    
    const lesson = await Lesson.findById(req.params.id);
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const course = await Course.findById(lesson.course);
    
    // Check if user is enrolled
    if (!course.isUserEnrolled(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to complete lessons'
      });
    }

    // Find or create progress
    let progress = await Progress.findOne({
      user: req.user.id,
      course: lesson.course
    });

    if (!progress) {
      progress = await Progress.create({
        user: req.user.id,
        course: lesson.course
      });
    }

    // Mark lesson as completed
    await progress.completeLesson(lesson._id, timeSpent, watchedPercentage);

    res.status(200).json({
      success: true,
      message: 'Lesson marked as completed',
      data: {
        overallProgress: progress.overallProgress,
        completedLessons: progress.completedLessonsCount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error completing lesson'
    });
  }
});

// @desc    Update lesson progress (video watching)
// @route   PUT /api/lessons/:id/progress
// @access  Private
router.put('/:id/progress', protect, validate(schemas.updateLessonProgress), async (req, res) => {
  try {
    const { timeSpent = 0, watchedPercentage = 0 } = req.body;
    
    const lesson = await Lesson.findById(req.params.id);
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const course = await Course.findById(lesson.course);
    
    // Check if user is enrolled
    if (!course.isUserEnrolled(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to track progress'
      });
    }

    // Find or create progress
    let progress = await Progress.findOne({
      user: req.user.id,
      course: lesson.course
    });

    if (!progress) {
      progress = await Progress.create({
        user: req.user.id,
        course: lesson.course
      });
    }

    // Update lesson progress
    await progress.updateLessonProgress(lesson._id, timeSpent, watchedPercentage);

    const lessonProgress = progress.lessonsProgress.find(
      lp => lp.lesson.toString() === lesson._id.toString()
    );

    res.status(200).json({
      success: true,
      data: {
        lessonProgress,
        overallProgress: progress.overallProgress
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating lesson progress'
    });
  }
});

// @desc    Reorder lessons in a course
// @route   PUT /api/lessons/course/:courseId/reorder
// @access  Private (Admin only)
router.put('/course/:courseId/reorder', protect, authorize('admin'), async (req, res) => {
  try {
    const { lessons } = req.body; // Array of { id, order }
    
    if (!Array.isArray(lessons)) {
      return res.status(400).json({
        success: false,
        message: 'Lessons must be an array'
      });
    }

    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Update lesson orders
    const updatePromises = lessons.map(({ id, order }) =>
      Lesson.findByIdAndUpdate(id, { order }, { new: true })
    );

    const updatedLessons = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      data: updatedLessons,
      message: 'Lessons reordered successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error reordering lessons'
    });
  }
});

module.exports = router;