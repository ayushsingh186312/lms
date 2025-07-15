const express = require('express');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');
const Progress = require('../models/Progress');
const User = require('../models/User');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { validate, validateQuery, schemas } = require('../middleware/validation');
const { paginate, buildCourseSearchQuery, buildSortOptions } = require('../utils/pagination');

const router = express.Router();

// @desc    Get all courses with pagination and filtering
// @route   GET /api/courses
// @access  Public
router.get('/', optionalAuth, validateQuery(schemas.paginationQuery), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-created',
      search,
      category,
      level,
      priceMin,
      priceMax
    } = req.query;

    // Build search query
    const searchQuery = buildCourseSearchQuery({
      search,
      category,
      level,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
      includeUnpublished: req.user && req.user.role === 'admin'
    });

    // Build sort options
    const sortOptions = buildSortOptions(sort);

    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      populate: 'lessons quizzes',
      select: '-enrollments'
    };

    const result = await paginate(Course, searchQuery, options);

    res.status(200).json({
      success: true,
      data: result.docs,
      pagination: {
        page: result.page,
        pages: result.totalPages,
        total: result.totalDocs,
        limit: result.limit,
        hasNext: result.hasNextPage,
        hasPrev: result.hasPrevPage
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching courses'
    });
  }
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({
        path: 'lessons',
        select: 'title description duration order isPreview',
        options: { sort: { order: 1 } }
      })
      .populate({
        path: 'quizzes',
        select: 'title description questionCount totalPoints passingScore order',
        options: { sort: { order: 1 } }
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is published (unless user is admin)
    if (!course.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled
    let isEnrolled = false;
    let progress = null;
    
    if (req.user) {
      isEnrolled = course.isUserEnrolled(req.user.id);
      
      if (isEnrolled) {
        progress = await Progress.findOne({
          user: req.user.id,
          course: req.params.id
        });
      }
    }

    // Filter lessons for non-enrolled users
    if (!isEnrolled && req.user?.role !== 'admin') {
      course.lessons = course.lessons.filter(lesson => lesson.isPreview);
    }

    res.status(200).json({
      success: true,
      data: {
        course,
        isEnrolled,
        progress: progress ? {
          overallProgress: progress.overallProgress,
          completedLessons: progress.completedLessonsCount,
          totalLessons: course.lessons.length,
          completedQuizzes: progress.passedQuizzesCount,
          totalQuizzes: course.quizzes.length
        } : null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching course'
    });
  }
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), validate(schemas.createCourse), async (req, res) => {
  try {
    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error creating course'
    });
  }
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), validate(schemas.updateCourse), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating course'
    });
  }
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Delete related lessons and quizzes
    await Lesson.deleteMany({ course: req.params.id });
    await Quiz.deleteMany({ course: req.params.id });
    await Progress.deleteMany({ course: req.params.id });

    // Remove course from user enrollments
    await User.updateMany(
      { 'enrolledCourses.course': req.params.id },
      { $pull: { enrolledCourses: { course: req.params.id } } }
    );

    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting course'
    });
  }
});

// @desc    Enroll in course
// @route   POST /api/courses/:id/enroll
// @access  Private
router.post('/:id/enroll', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Course is not published'
      });
    }

    // Check if already enrolled
    if (course.isUserEnrolled(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Enroll user in course
    await course.enrollUser(req.user.id);

    // Add course to user's enrolled courses
    await User.findByIdAndUpdate(
      req.user.id,
      {
        $push: {
          enrolledCourses: {
            course: req.params.id,
            enrolledAt: new Date()
          }
        }
      }
    );

    // Create progress tracking
    await Progress.create({
      user: req.user.id,
      course: req.params.id,
      enrolledAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error during enrollment'
    });
  }
});

// @desc    Get enrolled courses for current user
// @route   GET /api/courses/my/enrolled
// @access  Private
router.get('/my/enrolled', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'enrolledCourses.course',
        select: 'title description thumbnail price category level duration'
      });

    // Get progress for each enrolled course
    const enrolledCoursesWithProgress = await Promise.all(
      user.enrolledCourses.map(async (enrollment) => {
        const progress = await Progress.findOne({
          user: req.user.id,
          course: enrollment.course._id
        });

        return {
          course: enrollment.course,
          enrolledAt: enrollment.enrolledAt,
          progress: progress ? {
            overallProgress: progress.overallProgress,
            completedLessons: progress.completedLessonsCount,
            totalQuizAttempts: progress.totalQuizAttempts,
            completedAt: progress.completedAt
          } : null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrolledCoursesWithProgress
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching enrolled courses'
    });
  }
});

// @desc    Get course statistics (Admin only)
// @route   GET /api/courses/:id/stats
// @access  Private (Admin only)
router.get('/:id/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get enrollment statistics
    const totalEnrollments = course.enrollments.length;
    const progressStats = await Progress.aggregate([
      { $match: { course: course._id } },
      {
        $group: {
          _id: null,
          averageProgress: { $avg: '$overallProgress' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$overallProgress', 100] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = {
      totalEnrollments,
      averageProgress: progressStats[0]?.averageProgress || 0,
      completionRate: totalEnrollments > 0 ? (progressStats[0]?.completedCount || 0) / totalEnrollments * 100 : 0,
      totalLessons: course.lessons.length,
      totalQuizzes: course.quizzes.length
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching course statistics'
    });
  }
});

module.exports = router;