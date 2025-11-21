# 📰 News Summarizer

A web app that fetches news articles, displays summaries, and allows users to search, filter, and bookmark stories.

## 🚀 Features

- 👤 User profiles with username, bio, and profile picture
- 🌓 Toggle light/dark theme for personalized viewing
- 🧠 News summarization for quick insights
- 🔍 Search and filter news by category, author, date, title, or source
- 💾 Bookmark and unbookmark articles for later reading
- ❤️ Like and comment on news posts to engage with content
- 🔑 Secure user authentication with JWT
- 🌐 Responsive frontend built using EJS
- 🗄️ Backend powered by Express.js and MongoDB

## 📁 Folder Structure
```bash
NEWS-SUMMARIZER/
│
├── controllers/
│   ├── authController.js          # Handles user authentication (register, login, profile)
│   └── userController.js          # Handles user interactions (like, comment, bookmark)
│
├── database/
│   └── DatabaseConnection.js      # MongoDB connection setup
│
├── logs/                          # Log files (if any)
│
├── middlewares/
│   └── authMiddleware.js          # JWT authentication middleware
│
├── models/
│   ├── News.js                    # Schema for news articles
│   ├── User.js                    # Schema for user accounts
│   └── UserNews.js                # Schema for user-news interactions (likes, comments, bookmarks)
│
├── routes/
│   ├── authRoutes.js              # Authentication-related API routes
│   ├── newsRoutes.js              # News fetching and category routes
│   └── userRoutes.js              # User activity routes (comment, like, bookmark)
│
├── services/                      # For future modular services (e.g., external APIs, summarization)
│
├── utils/                         # Utility functions (logging, helpers, etc.)
│
├── .env                           # Environment variables (DB URI, JWT secret, etc.)
├── .gitignore                     # Files and folders ignored by Git
├── app.js                         # Main Express app entry point
├── package.json                   # Project metadata and dependencies
├── package-lock.json              # Locked dependency versions
└── README.md                      # Project documentation
```


## 🧾 API Endpoints

Below is a summary of all API routes categorized by their functionality.

| Method   | Endpoint                        | Description                                                       |
| -------- | ------------------------------- | ----------------------------------------------------------------- |
| `POST`   | `/api/auth/register`            | Register a new user                                               |
| `POST`   | `/api/auth/login`               | Log in and receive a JWT token                                    |
| `GET`    | `/api/auth/profile`             | Get the logged-in user's profile (protected route)                |
| `GET`    | `/api/news`                     | Fetch all news articles                                           |
| `GET`    | `/api/news/:id`                 | Fetch a single news article by its ID                             |
| `GET`    | `/api/news/search?query=term`   | Search news articles by keyword                                   |
| `POST`   | `/api/news/subscribe`           | Subscribe to a news source                                        |
| `GET`    | `/api/news/category/:category`  | Get all news under a specific category                            |
| `POST`   | `/api/user/comment`             | Add a comment to a news article                                   |
| `POST`   | `/api/user/like`                | Like or unlike a news article                                     |
| `POST`   | `/api/user/bookmark`            | Toggle bookmark (save/unsave) for a news article                  |
| `GET`    | `/api/user/bookmarks/:username` | Get all bookmarked news for a specific user                       |
| `DELETE` | `/api/user/deleteComment`       | Delete a comment                                                  |
| `GET`    | `/api/user/search`              | Search for news (same as news search, with user-specific context) |

## 🧠 Tech Stack

**Frontend:** EJS 
**Backend:** Node.js, Express.js  
**Database:** MongoDB, Mongoose  
**Authentication:** JWT  



