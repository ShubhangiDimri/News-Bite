require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./database/DatabaseConnection");
const authRoutes = require("./routes/authRoutes");
const newsRoutes = require("./routes/newsRoutes");
const userRoutes = require("./routes/userRoutes");
const requestLogger = require("./middlewares/requestLogger");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Connect to Database
connectDB();

// ✅ Enable CORS before defining routes
app.use(cors({
  origin: "http://127.0.0.1:5500", // your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ✅ Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ✅ Middleware
app.use(requestLogger);

// ✅ Routes
app.get("/", (req, res) => {
  res.send("Welcome to the new summarizer api");
});

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/user', userRoutes);

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
