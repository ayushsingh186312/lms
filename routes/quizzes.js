const express = require('express');
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// @desc    Get quizzes for a course
// @route   GET /api/quizzes/course/:courseId
// @access  Private (enrolled users only)
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
        message: 'You must be enrolled in this course to access quizzes'
      });
    }

    const quizzes = await Quiz.find({ 
      course: req.params.courseId,
      isActive: true 
    })
    .sort({ order: 1 })
    .select('title description questionCount totalPoints passingScore timeLimit maxAttempts order');

    // Get user's quiz attempts for enrolled users
    let quizProgress = [];
    if (course.isUserEnrolled(req.user.id)) {
      const progress = await Progress.findOne({
        user: req.user.id,
        course: req.params.courseId
      });

      if (progress) {
        quizProgress = quizzes.map(quiz => {
          const attempts = progress.quizAttempts.filter(
            attempt => attempt.quiz.toString() === quiz._id.toString()
          );
          
          const bestScore = attempts.length > 0 
            ? attempts.reduce((best, current) => 
                current.score.percentage > best.score.percentage ? current : best
              )
            : null;

          return {
            quiz: quiz._id,
            attempts: attempts.length,
            bestScore: bestScore ? bestScore.score : null,
            lastAttempt: attempts.length > 0 ? attempts[attempts.length - 1].createdAt : null
          };
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        quizzes,
        progress: quizProgress
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching quizzes'
    });
  }
});

// @desc    Get single quiz (for taking)
// @route   GET /api/quizzes/:id
// @access  Private (enrolled users only)
router.get('/:id', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('course', 'title');
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    if (!quiz.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not active'
      });
    }

    const course = await Course.findById(quiz.course._id);
    
    // Check if user is enrolled or is admin
    if (req.user.role !== 'admin' && !course.isUserEnrolled(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to access this quiz'
      });
    }

    // Get user's progress for attempt limits
    let canAttempt = true;
    let attemptCount = 0;
    let bestScore = null;
    
    if (course.isUserEnrolled(req.user.id)) {
      const progress = await Progress.findOne({
        user: req.user.id,
        course: quiz.course._id
      });

      if (progress) {
        const attempts = progress.quizAttempts.filter(
          attempt => attempt.quiz.toString() === quiz._id.toString()
        );
        
        attemptCount = attempts.length;
        
        if (quiz.maxAttempts > 0 && attemptCount >= quiz.maxAttempts) {
          canAttempt = false;
        }

        if (attempts.length > 0) {
          bestScore = attempts.reduce((best, current) => 
            current.score.percentage > best.score.percentage ? current : best
          ).score;
        }
      }
    }

    // Return quiz without correct answers for taking
    const quizForTaking = {
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.getQuestionsForTaking(),
      timeLimit: quiz.timeLimit,
      passingScore: quiz.passingScore,
      totalPoints: quiz.totalPoints,
      questionCount: quiz.questionCount
    };

    res.status(200).json({
      success: true,
      data: {
        quiz: quizForTaking,
        canAttempt,
        attemptCount,
        maxAttempts: quiz.maxAttempts,
        bestScore
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching quiz'
    });
  }
});

// @desc    Create new quiz
// @route   POST /api/quizzes/:courseId
// @access  Private (Admin only)
router.post('/:courseId', protect, authorize('admin'), validate(schemas.createQuiz), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const quizData = {
      ...req.body,
      course: req.params.courseId
    };

    const quiz = await Quiz.create(quizData);

    // Add quiz to course
    course.quizzes.push(quiz._id);
    await course.save();

    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error creating quiz'
    });
  }
});

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), validate(schemas.updateQuiz), async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating quiz'
    });
  }
});

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Remove quiz from course
    await Course.findByIdAndUpdate(
      quiz.course,
      { $pull: { quizzes: quiz._id } }
    );

    // Remove quiz attempts from all users
    await Progress.updateMany(
      { course: quiz.course },
      { $pull: { quizAttempts: { quiz: quiz._id } } }
    );

    await quiz.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting quiz'
    });
  }
});

// @desc    Submit quiz attempt
// @route   POST /api/quizzes/:id/submit
// @access  Private
router.post('/:id/submit', protect, validate(schemas.submitQuiz), async (req, res) => {
  try {
    const { answers, timeSpent = 0 } = req.body;
    
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    if (!quiz.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not active'
      });
    }

    const course = await Course.findById(quiz.course);
    
    // Check if user is enrolled
    if (!course.isUserEnrolled(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to take quizzes'
      });
    }

    // Find or create progress
    let progress = await Progress.findOne({
      user: req.user.id,
      course: quiz.course
    });

    if (!progress) {
      progress = await Progress.create({
        user: req.user.id,
        course: quiz.course
      });
    }

    // Check attempt limits
    const existingAttempts = progress.quizAttempts.filter(
      attempt => attempt.quiz.toString() === quiz._id.toString()
    );

    if (quiz.maxAttempts > 0 && existingAttempts.length >= quiz.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: 'Maximum attempts reached for this quiz'
      });
    }

    // Validate answers format
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answers format'
      });
    }

    // Calculate score
    const score = quiz.calculateScore(answers);

    // Format answers for storage
    const formattedAnswers = answers.map((answer, index) => ({
      questionId: quiz.questions[index]._id,
      selectedOptions: Array.isArray(answer) ? answer : [answer]
    }));

    // Add quiz attempt
    await progress.addQuizAttempt(quiz._id, formattedAnswers, score, timeSpent);

    // Get detailed results with explanations for admin or if quiz is completed
    let detailedResults = null;
    if (req.user.role === 'admin' || score.passed) {
      detailedResults = quiz.questions.map((question, index) => {
        const userAnswers = Array.isArray(answers[index]) ? answers[index] : [answers[index]];
        const correctOptions = question.options.filter(option => option.isCorrect);
        
        return {
          question: question.text,
          userAnswers: userAnswers.map(answerId => {
            const option = question.options.find(opt => opt._id.toString() === answerId);
            return option ? option.text : 'Unknown answer';
          }),
          correctAnswers: correctOptions.map(option => option.text),
          isCorrect: score.correctAnswers > index, // This is a simplification
          explanation: question.explanation
        };
      });
    }

    res.status(200).json({
      success: true,
      message: score.passed ? 'Quiz completed successfully!' : 'Quiz completed. Better luck next time!',
      data: {
        score,
        attemptNumber: existingAttempts.length + 1,
        maxAttempts: quiz.maxAttempts,
        remainingAttempts: quiz.maxAttempts > 0 ? quiz.maxAttempts - (existingAttempts.length + 1) : null,
        detailedResults,
        overallProgress: progress.overallProgress
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting quiz'
    });
  }
});

// @desc    Get quiz results/attempts for user
// @route   GET /api/quizzes/:id/results
// @access  Private
router.get('/:id/results', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    const course = await Course.findById(quiz.course);
    
    // Check if user is enrolled or is admin
    if (req.user.role !== 'admin' && !course.isUserEnrolled(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to view quiz results'
      });
    }

    const progress = await Progress.findOne({
      user: req.user.id,
      course: quiz.course
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No quiz attempts found'
      });
    }

    const attempts = progress.quizAttempts.filter(
      attempt => attempt.quiz.toString() === quiz._id.toString()
    );

    if (attempts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No quiz attempts found'
      });
    }

    // Sort attempts by date (newest first)
    attempts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    const results = {
      quiz: {
        title: quiz.title,
        passingScore: quiz.passingScore,
        totalPoints: quiz.totalPoints
      },
      totalAttempts: attempts.length,
      bestScore: attempts.reduce((best, current) => 
        current.score.percentage > best.score.percentage ? current : best
      ).score,
      attempts: attempts.map(attempt => ({
        attemptDate: attempt.completedAt,
        score: attempt.score,
        timeSpent: attempt.timeSpent
      }))
    };

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching quiz results'
    });
  }
});

// @desc    Get quiz statistics (Admin only)
// @route   GET /api/quizzes/:id/stats
// @access  Private (Admin only)
router.get('/:id/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Get statistics from all user attempts
    const progressData = await Progress.find({ 
      course: quiz.course,
      'quizAttempts.quiz': quiz._id 
    });

    let totalAttempts = 0;
    let passedAttempts = 0;
    let totalScore = 0;
    let userStats = [];

    progressData.forEach(progress => {
      const userAttempts = progress.quizAttempts.filter(
        attempt => attempt.quiz.toString() === quiz._id.toString()
      );
      
      totalAttempts += userAttempts.length;
      
      const bestAttempt = userAttempts.reduce((best, current) => 
        current.score.percentage > best.score.percentage ? current : best
      );
      
      if (bestAttempt.score.passed) {
        passedAttempts++;
      }
      
      totalScore += bestAttempt.score.percentage;
      
      userStats.push({
        userId: progress.user,
        attempts: userAttempts.length,
        bestScore: bestAttempt.score.percentage,
        passed: bestAttempt.score.passed
      });
    });

    const stats = {
      totalUsers: userStats.length,
      totalAttempts,
      averageScore: userStats.length > 0 ? totalScore / userStats.length : 0,
      passRate: userStats.length > 0 ? (passedAttempts / userStats.length) * 100 : 0,
      averageAttemptsPerUser: userStats.length > 0 ? totalAttempts / userStats.length : 0
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching quiz statistics'
    });
  }
});

module.exports = router;