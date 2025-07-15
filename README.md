# Learning Management System (LMS) Backend

A comprehensive backend API for a Learning Management System built with Node.js, Express, and MongoDB. This system supports user authentication, course management, lesson tracking, quizzes, and progress monitoring.

## Features

### 🔐 User Authentication
- JWT-based authentication
- Role-based access control (Student, Admin)
- User registration and login
- Profile management
- Password updates

### 📚 Course Management
- Create, read, update, delete courses
- Course enrollment system
- Course categories and levels
- Search and filter courses
- Pagination support
- Course statistics for admins

### 📖 Lesson Management
- Create lessons with video URLs and resources
- Lesson ordering within courses
- Preview lessons for non-enrolled users
- Lesson completion tracking
- Video progress tracking

### 🧩 Quiz System
- Multiple-choice questions with explanations
- Quiz attempts with time limits
- Automatic scoring and feedback
- Multiple attempts allowed
- Pass/fail tracking
- Detailed quiz statistics

### 📊 Progress Tracking
- Real-time progress calculation
- Lesson completion tracking
- Quiz score tracking
- Course completion certificates
- Learning statistics and analytics
- Achievement tracking

### 🛡️ Security & Performance
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers
- MongoDB indexes for performance

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS, bcryptjs
- **Rate Limiting**: express-rate-limit

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lms-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
PORT=3000
NODE_ENV=development
```

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student" // optional, defaults to "student"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "John Updated",
  "profile": {
    "bio": "Learning enthusiast",
    "phone": "+1234567890"
  }
}
```

### Course Endpoints

#### Get All Courses (with pagination and filtering)
```http
GET /api/courses?page=1&limit=10&category=programming&level=beginner&search=javascript
```

#### Get Single Course
```http
GET /api/courses/:courseId
```

#### Create Course (Admin only)
```http
POST /api/courses
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "title": "JavaScript Fundamentals",
  "description": "Learn JavaScript from scratch",
  "instructor": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "bio": "Expert JavaScript developer"
  },
  "price": 99.99,
  "category": "programming",
  "level": "beginner",
  "tags": ["javascript", "web development", "programming"],
  "requirements": ["Basic computer skills"],
  "whatYouWillLearn": ["Variables and functions", "DOM manipulation", "ES6 features"]
}
```

#### Enroll in Course
```http
POST /api/courses/:courseId/enroll
Authorization: Bearer <jwt_token>
```

#### Get Enrolled Courses
```http
GET /api/courses/my/enrolled
Authorization: Bearer <jwt_token>
```

### Lesson Endpoints

#### Get Lessons for Course
```http
GET /api/lessons/course/:courseId
Authorization: Bearer <jwt_token>
```

#### Get Single Lesson
```http
GET /api/lessons/:lessonId
Authorization: Bearer <jwt_token>
```

#### Create Lesson (Admin only)
```http
POST /api/lessons/:courseId
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "title": "Introduction to Variables",
  "description": "Learn about JavaScript variables",
  "videoUrl": "https://youtube.com/watch?v=example",
  "duration": 15,
  "order": 1,
  "resources": [
    {
      "title": "MDN Documentation",
      "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types",
      "type": "website"
    }
  ],
  "isPreview": true
}
```

#### Mark Lesson as Completed
```http
POST /api/lessons/:lessonId/complete
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "timeSpent": 15,
  "watchedPercentage": 100
}
```

#### Update Lesson Progress
```http
PUT /api/lessons/:lessonId/progress
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "timeSpent": 5,
  "watchedPercentage": 50
}
```

### Quiz Endpoints

#### Get Quizzes for Course
```http
GET /api/quizzes/course/:courseId
Authorization: Bearer <jwt_token>
```

#### Get Quiz for Taking
```http
GET /api/quizzes/:quizId
Authorization: Bearer <jwt_token>
```

#### Create Quiz (Admin only)
```http
POST /api/quizzes/:courseId
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "title": "JavaScript Basics Quiz",
  "description": "Test your knowledge of JavaScript fundamentals",
  "questions": [
    {
      "text": "Which of the following is used to declare a variable in JavaScript?",
      "options": [
        {
          "text": "var",
          "isCorrect": true
        },
        {
          "text": "variable",
          "isCorrect": false
        },
        {
          "text": "declare",
          "isCorrect": false
        },
        {
          "text": "int",
          "isCorrect": false
        }
      ],
      "explanation": "The 'var' keyword is used to declare variables in JavaScript.",
      "points": 1
    }
  ],
  "timeLimit": 30,
  "passingScore": 70,
  "maxAttempts": 3
}
```

#### Submit Quiz
```http
POST /api/quizzes/:quizId/submit
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "answers": [
    ["option_id_1"], // Array of selected option IDs for each question
    ["option_id_2"]
  ],
  "timeSpent": 25
}
```

#### Get Quiz Results
```http
GET /api/quizzes/:quizId/results
Authorization: Bearer <jwt_token>
```

### Progress Endpoints

#### Get Course Progress
```http
GET /api/progress/course/:courseId
Authorization: Bearer <jwt_token>
```

#### Get Progress Overview
```http
GET /api/progress/overview
Authorization: Bearer <jwt_token>
```

#### Get Learning Statistics
```http
GET /api/progress/stats?timeframe=week
Authorization: Bearer <jwt_token>
```

#### Issue Certificate
```http
POST /api/progress/course/:courseId/certificate
Authorization: Bearer <jwt_token>
```

#### Get Certificates
```http
GET /api/progress/certificates
Authorization: Bearer <jwt_token>
```

## Database Models

### User Model
- Personal information (name, email, password)
- Role-based access (student, admin)
- Enrolled courses tracking
- Profile information

### Course Model
- Course details (title, description, instructor)
- Pricing and categorization
- Lessons and quizzes references
- Enrollment tracking

### Lesson Model
- Lesson content (title, video URL, resources)
- Course association and ordering
- Preview settings

### Quiz Model
- Quiz configuration (time limits, passing scores)
- Questions with multiple choice options
- Scoring and attempt settings

### Progress Model
- User progress tracking per course
- Lesson completion status
- Quiz attempt history
- Certificate issuance

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific field error"
    }
  ]
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting:
- 100 requests per 15 minutes per IP address
- Applied to all `/api/*` routes

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- CORS protection
- Helmet security headers
- Input validation with Joi
- MongoDB injection prevention
- Rate limiting

## Development

### Project Structure
```
├── models/           # Mongoose models
├── routes/           # Express route handlers
├── middleware/       # Custom middleware
├── utils/            # Utility functions
├── server.js         # Main application file
├── package.json      # Dependencies and scripts
└── README.md         # Project documentation
```

### Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
```

### Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRE` - JWT token expiration time
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository or contact the development team.