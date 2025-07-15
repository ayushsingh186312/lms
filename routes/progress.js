const express = require('express');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user's progress for a specific course
// @route   GET /api/progress/course/:courseId
// @access  Private
router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled or is admin
    if (req.user.role !== 'admin' && !course.isUserEnrolled(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to view progress'
      });
    }

    const progress = await Progress.findOne({
      user: req.user.id,
      course: req.params.courseId
    })
    .populate('lessonsProgress.lesson', 'title duration order')
    .populate('quizAttempts.quiz', 'title passingScore totalPoints');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress found for this course'
      });
    }

    // Calculate additional statistics
    const totalLessons = course.lessons.length;
    const totalQuizzes = course.quizzes.length;
    const completedLessons = progress.completedLessonsCount;
    const passedQuizzes = progress.passedQuizzesCount;

    // Get lesson progress summary
    const lessonProgress = progress.lessonsProgress.map(lp => ({
      lesson: lp.lesson,
      completed: lp.completed,
      completedAt: lp.completedAt,
      timeSpent: lp.timeSpent,
      watchedPercentage: lp.watchedPercentage
    }));

    // Get quiz progress summary
    const quizProgress = progress.bestQuizScores.map(score => ({
      quiz: score.quiz,
      bestScore: {
        percentage: score.percentage,
        passed: score.passed,
        earnedPoints: score.earnedPoints,
        totalPoints: score.totalPoints
      },
      attempts: progress.quizAttempts.filter(
        attempt => attempt.quiz.toString() === score.quiz
      ).length
    }));

    res.status(200).json({
      success: true,
      data: {
        course: {
          _id: course._id,
          title: course.title
        },
        overallProgress: progress.overallProgress,
        enrolledAt: progress.enrolledAt,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        stats: {
          totalLessons,
          completedLessons,
          totalQuizzes,
          passedQuizzes,
          completionRate: totalLessons + totalQuizzes > 0 
            ? Math.round(((completedLessons + passedQuizzes) / (totalLessons + totalQuizzes)) * 100)
            : 0
        },
        lessonProgress,
        quizProgress,
        certificateIssued: progress.certificateIssued,
        certificateIssuedAt: progress.certificateIssuedAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching progress'
    });
  }
});

// @desc    Get user's overall progress across all courses
// @route   GET /api/progress/overview
// @access  Private
router.get('/overview', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get progress for all enrolled courses
    const progressData = await Progress.find({ user: req.user.id })
      .populate('course', 'title thumbnail category level duration price')
      .sort({ updatedAt: -1 });

    // Calculate overall statistics
    let totalCoursesEnrolled = progressData.length;
    let completedCourses = 0;
    let inProgressCourses = 0;
    let totalTimeSpent = 0;
    let totalLessonsCompleted = 0;
    let totalQuizzesPassed = 0;

    const courseProgress = progressData.map(progress => {
      // Calculate time spent across all lessons
      const courseTimeSpent = progress.lessonsProgress.reduce(
        (total, lesson) => total + (lesson.timeSpent || 0), 0
      );
      totalTimeSpent += courseTimeSpent;

      totalLessonsCompleted += progress.completedLessonsCount;
      totalQuizzesPassed += progress.passedQuizzesCount;

      if (progress.overallProgress === 100) {
        completedCourses++;
      } else if (progress.overallProgress > 0) {
        inProgressCourses++;
      }

      return {
        course: progress.course,
        overallProgress: progress.overallProgress,
        enrolledAt: progress.enrolledAt,
        completedAt: progress.completedAt,
        lastActivity: progress.updatedAt,
        timeSpent: courseTimeSpent,
        lessonsCompleted: progress.completedLessonsCount,
        quizzesPassed: progress.passedQuizzesCount
      };
    });

    // Get recently accessed courses (last 5)
    const recentCourses = courseProgress
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .slice(0, 5);

    // Get completed courses
    const completedCoursesData = courseProgress
      .filter(cp => cp.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalCoursesEnrolled,
          completedCourses,
          inProgressCourses,
          totalTimeSpent, // in minutes
          totalLessonsCompleted,
          totalQuizzesPassed,
          averageProgress: totalCoursesEnrolled > 0 
            ? Math.round(courseProgress.reduce((sum, cp) => sum + cp.overallProgress, 0) / totalCoursesEnrolled)
            : 0
        },
        recentCourses,
        completedCourses: completedCoursesData,
        allCourses: courseProgress
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching progress overview'
    });
  }
});

// @desc    Get detailed progress for a specific course (Admin only)
// @route   GET /api/progress/course/:courseId/detailed
// @access  Private (Admin only)
router.get('/course/:courseId/detailed', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate('lessons', 'title order')
      .populate('quizzes', 'title order');
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get progress data for all users in this course
    const progressData = await Progress.find({ course: req.params.courseId })
      .populate('user', 'name email')
      .populate('lessonsProgress.lesson', 'title order')
      .populate('quizAttempts.quiz', 'title');

    // Calculate course statistics
    const totalEnrolled = progressData.length;
    const completedUsers = progressData.filter(p => p.overallProgress === 100).length;
    const averageProgress = totalEnrolled > 0 
      ? progressData.reduce((sum, p) => sum + p.overallProgress, 0) / totalEnrolled
      : 0;

    // User progress details
    const userProgress = progressData.map(progress => ({
      user: progress.user,
      enrolledAt: progress.enrolledAt,
      overallProgress: progress.overallProgress,
      completedAt: progress.completedAt,
      lessonsCompleted: progress.completedLessonsCount,
      totalLessons: course.lessons.length,
      quizzesPassed: progress.passedQuizzesCount,
      totalQuizzes: course.quizzes.length,
      lastActivity: progress.updatedAt,
      timeSpent: progress.lessonsProgress.reduce((total, lp) => total + (lp.timeSpent || 0), 0)
    }));

    // Lesson completion statistics
    const lessonStats = course.lessons.map(lesson => {
      const completions = progressData.filter(p => 
        p.lessonsProgress.some(lp => 
          lp.lesson && lp.lesson._id.toString() === lesson._id.toString() && lp.completed
        )
      ).length;

      return {
        lesson: lesson.title,
        order: lesson.order,
        completions,
        completionRate: totalEnrolled > 0 ? Math.round((completions / totalEnrolled) * 100) : 0
      };
    });

    // Quiz performance statistics
    const quizStats = course.quizzes.map(quiz => {
      const attempts = progressData.reduce((total, p) => 
        total + p.quizAttempts.filter(qa => 
          qa.quiz && qa.quiz._id.toString() === quiz._id.toString()
        ).length, 0
      );

      const passed = progressData.filter(p => 
        p.quizAttempts.some(qa => 
          qa.quiz && qa.quiz._id.toString() === quiz._id.toString() && qa.score.passed
        )
      ).length;

      const totalScore = progressData.reduce((sum, p) => {
        const bestScore = p.quizAttempts
          .filter(qa => qa.quiz && qa.quiz._id.toString() === quiz._id.toString())
          .reduce((best, current) => 
            current.score.percentage > best.score.percentage ? current : best, 
            { score: { percentage: 0 } }
          );
        return sum + bestScore.score.percentage;
      }, 0);

      return {
        quiz: quiz.title,
        order: quiz.order,
        totalAttempts: attempts,
        passed,
        passRate: totalEnrolled > 0 ? Math.round((passed / totalEnrolled) * 100) : 0,
        averageScore: totalEnrolled > 0 ? Math.round(totalScore / totalEnrolled) : 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        course: {
          _id: course._id,
          title: course.title
        },
        statistics: {
          totalEnrolled,
          completedUsers,
          completionRate: totalEnrolled > 0 ? Math.round((completedUsers / totalEnrolled) * 100) : 0,
          averageProgress: Math.round(averageProgress)
        },
        userProgress,
        lessonStats,
        quizStats
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching detailed progress'
    });
  }
});

// @desc    Get user's learning statistics
// @route   GET /api/progress/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const { timeframe = 'all' } = req.query; // all, week, month, year

    // Calculate date filter based on timeframe
    let dateFilter = {};
    if (timeframe !== 'all') {
      const now = new Date();
      switch (timeframe) {
        case 'week':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
          break;
        case 'month':
          dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
          break;
        case 'year':
          dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
          break;
      }
    }

    const progressData = await Progress.find({ 
      user: req.user.id,
      ...(timeframe !== 'all' && { updatedAt: dateFilter })
    })
    .populate('course', 'title category level');

    // Calculate statistics
    let totalTimeSpent = 0;
    let totalLessonsCompleted = 0;
    let totalQuizzesPassed = 0;
    let coursesCompleted = 0;
    let categoryStats = {};
    let levelStats = {};

    progressData.forEach(progress => {
      // Time spent
      totalTimeSpent += progress.lessonsProgress.reduce(
        (total, lesson) => total + (lesson.timeSpent || 0), 0
      );

      // Lessons and quizzes
      totalLessonsCompleted += progress.completedLessonsCount;
      totalQuizzesPassed += progress.passedQuizzesCount;

      // Completed courses
      if (progress.overallProgress === 100) {
        coursesCompleted++;
      }

      // Category and level breakdown
      if (progress.course) {
        const category = progress.course.category;
        const level = progress.course.level;

        categoryStats[category] = (categoryStats[category] || 0) + 1;
        levelStats[level] = (levelStats[level] || 0) + 1;
      }
    });

    // Get recent achievements (completed lessons/quizzes in the last week)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentAchievements = [];
    
    progressData.forEach(progress => {
      // Recent lesson completions
      progress.lessonsProgress.forEach(lp => {
        if (lp.completedAt && lp.completedAt >= weekAgo) {
          recentAchievements.push({
            type: 'lesson',
            date: lp.completedAt,
            course: progress.course.title,
            description: `Completed lesson in ${progress.course.title}`
          });
        }
      });

      // Recent quiz passes
      progress.quizAttempts.forEach(qa => {
        if (qa.completedAt && qa.completedAt >= weekAgo && qa.score.passed) {
          recentAchievements.push({
            type: 'quiz',
            date: qa.completedAt,
            course: progress.course.title,
            description: `Passed quiz in ${progress.course.title} with ${qa.score.percentage}%`
          });
        }
      });
    });

    // Sort recent achievements by date
    recentAchievements.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      data: {
        timeframe,
        summary: {
          totalTimeSpent, // in minutes
          totalLessonsCompleted,
          totalQuizzesPassed,
          coursesCompleted,
          coursesEnrolled: progressData.length
        },
        breakdown: {
          byCategory: categoryStats,
          byLevel: levelStats
        },
        recentAchievements: recentAchievements.slice(0, 10) // Last 10 achievements
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching learning statistics'
    });
  }
});

// @desc    Issue certificate for completed course
// @route   POST /api/progress/course/:courseId/certificate
// @access  Private
router.post('/course/:courseId/certificate', protect, async (req, res) => {
  try {
    const progress = await Progress.findOne({
      user: req.user.id,
      course: req.params.courseId
    }).populate('course', 'title');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress not found for this course'
      });
    }

    if (progress.overallProgress !== 100) {
      return res.status(400).json({
        success: false,
        message: 'Course must be 100% completed to issue certificate'
      });
    }

    if (progress.certificateIssued) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already issued for this course'
      });
    }

    // Issue certificate
    progress.certificateIssued = true;
    progress.certificateIssuedAt = new Date();
    await progress.save();

    res.status(200).json({
      success: true,
      message: 'Certificate issued successfully',
      data: {
        course: progress.course.title,
        issuedAt: progress.certificateIssuedAt,
        completedAt: progress.completedAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error issuing certificate'
    });
  }
});

// @desc    Get user's certificates
// @route   GET /api/progress/certificates
// @access  Private
router.get('/certificates', protect, async (req, res) => {
  try {
    const certificates = await Progress.find({
      user: req.user.id,
      certificateIssued: true
    })
    .populate('course', 'title description instructor category level thumbnail')
    .sort({ certificateIssuedAt: -1 });

    const certificateData = certificates.map(cert => ({
      course: cert.course,
      completedAt: cert.completedAt,
      certificateIssuedAt: cert.certificateIssuedAt,
      finalProgress: cert.overallProgress
    }));

    res.status(200).json({
      success: true,
      data: certificateData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching certificates'
    });
  }
});

module.exports = router;