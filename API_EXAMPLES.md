# LMS API Usage Examples

This document provides practical examples of how to use the LMS backend API with curl commands and JavaScript examples.

## Quick Start

1. Start the server:
```bash
npm start
```

2. Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

## Authentication Flow

### 1. Register a New User

**Student Registration:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Student",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Admin Registration:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Admin",
    "email": "jane@example.com",
    "password": "password123",
    "role": "admin"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "615f1c5c7d4a3c001f5e4a1b",
    "name": "John Student",
    "email": "john@example.com",
    "role": "student"
  }
}
```

### 3. Get Current User

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Course Management

### 1. Create a Course (Admin Only)

```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "title": "JavaScript Fundamentals",
    "description": "Learn JavaScript from scratch with hands-on examples and projects.",
    "instructor": {
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "bio": "Expert JavaScript developer with 10+ years of experience"
    },
    "price": 99.99,
    "category": "programming",
    "level": "beginner",
    "tags": ["javascript", "web development", "programming"],
    "requirements": ["Basic computer skills"],
    "whatYouWillLearn": [
      "Variables and data types",
      "Functions and scope",
      "DOM manipulation"
    ]
  }'
```

### 2. Get All Courses with Filtering

```bash
# Get all courses
curl "http://localhost:3000/api/courses"

# Get programming courses for beginners
curl "http://localhost:3000/api/courses?category=programming&level=beginner"

# Search courses with pagination
curl "http://localhost:3000/api/courses?search=javascript&page=1&limit=10"

# Filter by price range
curl "http://localhost:3000/api/courses?priceMin=50&priceMax=150"
```

### 3. Get Single Course

```bash
curl http://localhost:3000/api/courses/COURSE_ID
```

### 4. Enroll in Course

```bash
curl -X POST http://localhost:3000/api/courses/COURSE_ID/enroll \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

### 5. Get Enrolled Courses

```bash
curl http://localhost:3000/api/courses/my/enrolled \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

## Lesson Management

### 1. Create a Lesson (Admin Only)

```bash
curl -X POST http://localhost:3000/api/lessons/COURSE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "title": "Introduction to Variables",
    "description": "Learn about JavaScript variables and how to use them effectively",
    "videoUrl": "https://youtube.com/watch?v=example",
    "duration": 15,
    "order": 1,
    "resources": [
      {
        "title": "MDN Variables Documentation",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types",
        "type": "website"
      }
    ],
    "content": "In this lesson, we will explore JavaScript variables...",
    "isPreview": true
  }'
```

### 2. Get Lessons for a Course

```bash
curl http://localhost:3000/api/lessons/course/COURSE_ID \
  -H "Authorization: Bearer JWT_TOKEN"
```

### 3. Get Single Lesson

```bash
curl http://localhost:3000/api/lessons/LESSON_ID \
  -H "Authorization: Bearer JWT_TOKEN"
```

### 4. Mark Lesson as Completed

```bash
curl -X POST http://localhost:3000/api/lessons/LESSON_ID/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN" \
  -d '{
    "timeSpent": 15,
    "watchedPercentage": 100
  }'
```

### 5. Update Lesson Progress

```bash
curl -X PUT http://localhost:3000/api/lessons/LESSON_ID/progress \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN" \
  -d '{
    "timeSpent": 5,
    "watchedPercentage": 50
  }'
```

## Quiz Management

### 1. Create a Quiz (Admin Only)

```bash
curl -X POST http://localhost:3000/api/quizzes/COURSE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "title": "JavaScript Basics Quiz",
    "description": "Test your knowledge of JavaScript fundamentals",
    "questions": [
      {
        "text": "Which of the following is used to declare a variable in JavaScript?",
        "options": [
          {"text": "var", "isCorrect": true},
          {"text": "variable", "isCorrect": false},
          {"text": "declare", "isCorrect": false},
          {"text": "int", "isCorrect": false}
        ],
        "explanation": "The var keyword is used to declare variables in JavaScript.",
        "points": 1
      }
    ],
    "timeLimit": 30,
    "passingScore": 70,
    "maxAttempts": 3
  }'
```

### 2. Get Quizzes for Course

```bash
curl http://localhost:3000/api/quizzes/course/COURSE_ID \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

### 3. Get Quiz for Taking

```bash
curl http://localhost:3000/api/quizzes/QUIZ_ID \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

### 4. Submit Quiz

```bash
curl -X POST http://localhost:3000/api/quizzes/QUIZ_ID/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN" \
  -d '{
    "answers": [
      ["OPTION_ID_1"],
      ["OPTION_ID_2"]
    ],
    "timeSpent": 25
  }'
```

### 5. Get Quiz Results

```bash
curl http://localhost:3000/api/quizzes/QUIZ_ID/results \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

## Progress Tracking

### 1. Get Course Progress

```bash
curl http://localhost:3000/api/progress/course/COURSE_ID \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

### 2. Get Progress Overview

```bash
curl http://localhost:3000/api/progress/overview \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

### 3. Get Learning Statistics

```bash
# All time stats
curl http://localhost:3000/api/progress/stats \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"

# Weekly stats
curl "http://localhost:3000/api/progress/stats?timeframe=week" \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"

# Monthly stats
curl "http://localhost:3000/api/progress/stats?timeframe=month" \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

### 4. Issue Certificate

```bash
curl -X POST http://localhost:3000/api/progress/course/COURSE_ID/certificate \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

### 5. Get Certificates

```bash
curl http://localhost:3000/api/progress/certificates \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

## JavaScript Examples

### Using fetch API

```javascript
// Base configuration
const API_BASE = 'http://localhost:3000/api';
let authToken = '';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` })
    },
    ...options
  };

  const response = await fetch(url, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'API call failed');
  }
  
  return data;
}

// Register and login
async function registerAndLogin() {
  // Register
  const registerData = await apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    })
  });
  
  // Store token
  authToken = registerData.token;
  console.log('Registered and logged in:', registerData.user.name);
}

// Get courses
async function getCourses() {
  const courses = await apiCall('/courses');
  console.log('Available courses:', courses.data.length);
  return courses.data;
}

// Enroll in course
async function enrollInCourse(courseId) {
  await apiCall(`/courses/${courseId}/enroll`, {
    method: 'POST'
  });
  console.log('Enrolled in course');
}

// Complete lesson
async function completeLesson(lessonId) {
  const result = await apiCall(`/lessons/${lessonId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      timeSpent: 15,
      watchedPercentage: 100
    })
  });
  console.log('Lesson completed. Progress:', result.data.overallProgress + '%');
}
```

### Using axios

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Set auth token after login
function setAuthToken(token) {
  api.defaults.headers.Authorization = `Bearer ${token}`;
}

// Example usage
async function example() {
  try {
    // Register
    const registerResponse = await api.post('/auth/register', {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    });
    
    setAuthToken(registerResponse.data.token);
    
    // Get courses
    const coursesResponse = await api.get('/courses');
    console.log('Courses:', coursesResponse.data.data);
    
    // Enroll in first course
    if (coursesResponse.data.data.length > 0) {
      const courseId = coursesResponse.data.data[0]._id;
      await api.post(`/courses/${courseId}/enroll`);
      console.log('Enrolled in course');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Testing the API

You can run the included test script to see the full API in action:

```bash
node test-api.js
```

This script will:
1. Register admin and student users
2. Create a course with lessons and quizzes
3. Enroll student in the course
4. Complete lessons and take quizzes
5. Track progress and issue certificates
6. Display statistics

## Rate Limiting

The API has rate limiting in place:
- 100 requests per 15 minutes per IP
- Applies to all `/api/*` endpoints

If you hit the rate limit, you'll receive a `429` status code with the message:
```json
{
  "message": "Too many requests from this IP, please try again later."
}
```