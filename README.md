# ⚡ NewsBite

**NewsBite** is a high-performance news aggregator and summarizer designed for the modern reader. It fetches the latest stories from around the world, delivers them in bite-sized snippets, and provides a premium, interactive experience with community engagement features.

---

## ✨ Features

- **� Smart Summarization**: Get the gist of every story instantly with our optimized summarization engine.
- **🌓 Premium Dual-Mode UI**: Seamlessly toggle between a sleek dark mode and a "Premium Polish" light mode.
- **🔍 Advanced Search & Discovery**: Filter news by category, source, date, or keywords with a powerful search interface.
- **� Community Interaction**: Like, comment, and reply to news posts to engage with other readers.
- **🔖 Personal Library**: Save and bookmark your favorite articles for later reading.
- **� Secure Experience**: Full user authentication system powered by JWT and encrypted passwords.
- **🛠️ Admin Panel**: Comprehensive management suite for monitoring user activity and system stats.

---

## 🏗️ Folder Structure

```bash
NEWS-BITE/
├── controllers/       # Business logic (Auth, User activity, Admin, etc.)
├── database/          # Database connection & configuration
├── middlewares/       # Security, Auth, and Loggers
├── models/            # Mongoose schemas (News, User, UserNews)
├── public/            # Static assets (Premium CSS, Frontend JS)
├── routes/            # API & View routing
├── services/          # Core logic (News Fetcher, Moderation)
├── utils/             # Helpers (Validation, Sanitization)
├── views/             # EJS Templates
├── app.js             # Main entry point
└── .env               # Environment configuration
```

---

## 🛠️ Tech Stack

- **Frontend**: EJS (Embedded JavaScript), Vanilla CSS (Custom Design System)
- **Backend**: Node.js, Express.js (v5+)
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JsonWebToken (JWT), BcryptJS
- **Communication**: Axios, Cookie-Parser
- **Logging**: Winston

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or a local MongoDB instance
- [NewsAPI Key](https://newsapi.org/) (Free tier available)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ShubhangiDimri/News-Bite.git
   cd News-Bite
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   NEWS_API_KEY=your_newsapi_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

---

## 🧾 API Documentation

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Log in and receive JWT | ❌ |
| `GET` | `/api/news` | Fetch recent news articles | ❌ |
| `GET` | `/api/news/search` | Search & Filter news | ❌ |
| `POST` | `/api/user/comment` | Add a comment to a story | ✅ |
| `POST` | `/api/user/like` | Like/Unlike a story | ✅ |
| `POST` | `/api/user/bookmark` | Save a story to favorites | ✅ |
| `GET` | `/api/admin/stats` | View system statistics | ✅ (Admin) |

---

## 📜 License

Distributed under the ISC License. See `LICENSE` for more information.



