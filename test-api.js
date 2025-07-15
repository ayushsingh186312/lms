/**
 * Simple API Test Script for LMS Backend
 * This script demonstrates the basic functionality of the LMS API
 * Run with: node test-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testStudent = {
  name: 'John Student',
  email: 'john@student.com',
  password: 'password123'
};

const testAdmin = {
  name: 'Jane Admin',
  email: 'jane@admin.com',
  password: 'password123',
  role: 'admin'
};

const testCourse = {
  title: 'JavaScript Fundamentals',
  description: 'Learn JavaScript from scratch with hands-on examples and projects. This comprehensive course covers everything from basic syntax to advanced concepts.',
  instructor: {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    bio: 'Expert JavaScript developer with 10+ years of experience'
  },
  price: 99.99,
  category: 'programming',
  level: 'beginner',
  tags: ['javascript', 'web development', 'programming'],
  requirements: ['Basic computer skills', 'Text editor'],
  whatYouWillLearn: [
    'Variables and data types',
    'Functions and scope',
    'DOM manipulation',
    'ES6+ features',
    'Async programming'
  ]
};

const testLesson = {
  title: 'Introduction to Variables',
  description: 'Learn about JavaScript variables and how to use them effectively',
  videoUrl: 'https://youtube.com/watch?v=example',
  duration: 15,
  order: 1,
  resources: [
    {
      title: 'MDN Variables Documentation',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types',
      type: 'website'
    }
  ],
  content: 'In this lesson, we will explore JavaScript variables...',
  isPreview: true
};

const testQuiz = {
  title: 'JavaScript Basics Quiz',
  description: 'Test your knowledge of JavaScript fundamentals',
  questions: [
    {
      text: 'Which of the following is used to declare a variable in JavaScript?',
      options: [
        { text: 'var', isCorrect: true },
        { text: 'variable', isCorrect: false },
        { text: 'declare', isCorrect: false },
        { text: 'int', isCorrect: false }
      ],
      explanation: 'The var keyword is used to declare variables in JavaScript.',
      points: 1
    },
    {
      text: 'What is the correct way to write a JavaScript array?',
      options: [
        { text: 'var colors = "red", "green", "blue"', isCorrect: false },
        { text: 'var colors = ["red", "green", "blue"]', isCorrect: true },
        { text: 'var colors = (1:"red", 2:"green", 3:"blue")', isCorrect: false },
        { text: 'var colors = 1 = ("red"), 2 = ("green"), 3 = ("blue")', isCorrect: false }
      ],
      explanation: 'Arrays in JavaScript are defined with square brackets and comma-separated values.',
      points: 1
    }
  ],
  timeLimit: 30,
  passingScore: 70,
  maxAttempts: 3
};

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    console.log('🚀 Starting LMS API Tests...\n');

    // 1. Test Health Check
    console.log('1. Testing Health Check...');
    const health = await apiRequest('GET', '/health');
    console.log('✅ Health check:', health.message);

    // 2. Register Admin User
    console.log('\n2. Registering Admin User...');
    const adminRegister = await apiRequest('POST', '/auth/register', testAdmin);
    const adminToken = adminRegister.token;
    console.log('✅ Admin registered:', adminRegister.user.name);

    // 3. Register Student User
    console.log('\n3. Registering Student User...');
    const studentRegister = await apiRequest('POST', '/auth/register', testStudent);
    const studentToken = studentRegister.token;
    console.log('✅ Student registered:', studentRegister.user.name);

    // 4. Create Course (Admin)
    console.log('\n4. Creating Course...');
    const course = await apiRequest('POST', '/courses', testCourse, adminToken);
    const courseId = course.data._id;
    console.log('✅ Course created:', course.data.title);

    // 5. Publish Course (Admin)
    console.log('\n5. Publishing Course...');
    await apiRequest('PUT', `/courses/${courseId}`, { isPublished: true }, adminToken);
    console.log('✅ Course published');

    // 6. Create Lesson (Admin)
    console.log('\n6. Creating Lesson...');
    const lesson = await apiRequest('POST', `/lessons/${courseId}`, testLesson, adminToken);
    const lessonId = lesson.data._id;
    console.log('✅ Lesson created:', lesson.data.title);

    // 7. Create Quiz (Admin)
    console.log('\n7. Creating Quiz...');
    const quiz = await apiRequest('POST', `/quizzes/${courseId}`, testQuiz, adminToken);
    const quizId = quiz.data._id;
    console.log('✅ Quiz created:', quiz.data.title);

    // 8. Get All Courses (Public)
    console.log('\n8. Getting All Courses...');
    const courses = await apiRequest('GET', '/courses?page=1&limit=5');
    console.log('✅ Found courses:', courses.data.length);

    // 9. Get Single Course (Public)
    console.log('\n9. Getting Course Details...');
    const courseDetails = await apiRequest('GET', `/courses/${courseId}`);
    console.log('✅ Course details retrieved:', courseDetails.data.course.title);

    // 10. Enroll Student in Course
    console.log('\n10. Enrolling Student in Course...');
    await apiRequest('POST', `/courses/${courseId}/enroll`, null, studentToken);
    console.log('✅ Student enrolled in course');

    // 11. Get Enrolled Courses
    console.log('\n11. Getting Enrolled Courses...');
    const enrolledCourses = await apiRequest('GET', '/courses/my/enrolled', null, studentToken);
    console.log('✅ Enrolled courses:', enrolledCourses.data.length);

    // 12. Mark Lesson as Completed
    console.log('\n12. Completing Lesson...');
    await apiRequest('POST', `/lessons/${lessonId}/complete`, {
      timeSpent: 15,
      watchedPercentage: 100
    }, studentToken);
    console.log('✅ Lesson marked as completed');

    // 13. Take Quiz
    console.log('\n13. Taking Quiz...');
    const quizResult = await apiRequest('POST', `/quizzes/${quizId}/submit`, {
      answers: [
        [quiz.data.questions[0].options[0]._id], // First correct answer
        [quiz.data.questions[1].options[1]._id]  // Second correct answer
      ],
      timeSpent: 25
    }, studentToken);
    console.log('✅ Quiz completed. Score:', quizResult.data.score.percentage + '%');

    // 14. Get Progress
    console.log('\n14. Getting Course Progress...');
    const progress = await apiRequest('GET', `/progress/course/${courseId}`, null, studentToken);
    console.log('✅ Course progress:', progress.data.overallProgress + '%');

    // 15. Get Progress Overview
    console.log('\n15. Getting Progress Overview...');
    const overview = await apiRequest('GET', '/progress/overview', null, studentToken);
    console.log('✅ Total enrolled courses:', overview.data.overview.totalCoursesEnrolled);

    // 16. Issue Certificate (if course is completed)
    if (progress.data.overallProgress === 100) {
      console.log('\n16. Issuing Certificate...');
      await apiRequest('POST', `/progress/course/${courseId}/certificate`, null, studentToken);
      console.log('✅ Certificate issued');
    } else {
      console.log('\n16. Course not 100% complete, skipping certificate issuance');
    }

    // 17. Get Course Statistics (Admin)
    console.log('\n17. Getting Course Statistics...');
    const stats = await apiRequest('GET', `/courses/${courseId}/stats`, null, adminToken);
    console.log('✅ Course stats - Total enrollments:', stats.data.totalEnrollments);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('- Users registered: 2 (1 admin, 1 student)');
    console.log('- Courses created: 1');
    console.log('- Lessons created: 1');
    console.log('- Quizzes created: 1');
    console.log('- Enrollments: 1');
    console.log('- Quiz attempts: 1');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run tests only if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, apiRequest };