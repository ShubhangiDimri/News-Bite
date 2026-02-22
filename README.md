
  <h1> NewsBite</h1>
  <p><strong>Bite-Sized News for the Modern Reader</strong></p>

  [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
  [![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
  [![MongoDB](https://img.shields.io/badge/database-MongoDB-47A248?style=flat&logo=mongodb)](https://www.mongodb.com/)
  [![Express](https://img.shields.io/badge/framework-Express.js-000000?style=flat&logo=express)](https://expressjs.com/)
</div>

---

## 🌟 Overview

**NewsBite** is a high-performance news aggregator and summarizer. It fetches the latest stories globally, delivers them in bite-sized snippets, and provides a premium, interactive experience. Whether you want a quick update or a deep dive, NewsBite delivers news with speed and style.

### 🎯 Key Features

- 🤖 **Smart Summarization**: Instant summaries of every story powered by an optimized engine.
- 🌓 **Premium UI/UX**: Toggle between a sleek **Dark Mode** and a polished **Light Mode**.
- 🔍 **Advanced Discovery**: Filter by category, source, date, or keywords with real-time search.
- 💬 **Community Hub**: Like, comment, and engage with other readers on trending topics.
- 🔖 **Personalized Library**: Save and bookmark articles for offline and later reading.
- 🛡️ **Secure Platform**: JWT-based authentication with bcrypt encryption.
- � **Admin Dashboard**: Full suite for system monitoring and user management.

---

## 🏗️ Project Architecture

```bash
NEWS-BITE/
├── 📁 controllers   # Business logic (Auth, User activity, Admin)
├── 📁 database      # Database connection & configuration
├── 📁 middlewares   # Security, Auth, and Request Logging
├── 📁 models        # Mongoose schemas (News, User, Comments)
├── 📁 public        # Static assets (CSS, Frontend JS, Images)
├── 📁 routes        # API & View routing
├── 📁 services      # Core logic (News Fetcher, Moderation)
├── 📁 utils         # Helper functions (Validation, Sanitization)
├── 📁 views         # EJS Templates for Server-Side Rendering
├── 📄 app.js        # Application entry point
└── 📄 Dockerfile    # Containerization configuration
```

---

## 🛠️ Tech Stack

- **Frontend**: EJS (Embedded JavaScript), Vanilla CSS3 (Custom Design System)
- **Backend**: Node.js, Express.js (v5.x)
- **Database**: MongoDB (Mongoose ODM)
- **Security**: Helmet, BcryptJS, JWT, CORS
- **Logging**: Winston
- **Infrastructure**: Docker, Docker Compose

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18.x or higher
- **MongoDB** (Local or Atlas)
- **NewsAPI Key** ([Get one here](https://newsapi.org/))

### Installation

1. **Clone & Enter**:
   ```bash
   git clone https://github.com/ShubhangiDimri/News-Bite.git
   cd News-Bite
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root based on `.env.example`:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   NEWS_API_KEY=your_newsapi_key
   CLIENT_ORIGIN=http://localhost:5500
   ```

4. **Launch Application**:
   ```bash
   # Development mode with nodemon
   npm run dev
   
   # Production mode
   npm start
   ```

---

## 🐳 Docker Deployment

NewsBite is fully containerized for easy deployment.

**Run with Docker Compose:**
```bash
docker-compose up --build
```
This will spin up both the **Node.js application** and a **MongoDB instance** automatically.

---

## 🧾 API Overview

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | User Registration | ❌ |
| `POST` | `/api/auth/login` | User Login & JWT Issuance | ❌ |
| `GET` | `/api/news` | Fetch recent news articles | ❌ |
| `POST` | `/api/user/comment` | Add a comment to an article | ✅ |
| `POST` | `/api/user/like` | Like/Unlike an article | ✅ |
| `POST` | `/api/user/bookmark`| Save to bookmarks | ✅ |
| `GET` | `/api/admin/stats` | System statistics (Admin Only) | 🛡️ |




