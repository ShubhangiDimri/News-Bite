require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./database/DatabaseConnection");
const authRoutes = require("./routes/authRoutes");
const newsRoutes = require("./routes/newsRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require('./routes/adminRoutes')
const requestLogger = require("./middlewares/requestLogger");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Trust Proxy for cloud deployments (Render, Railway, etc.)
app.set("trust proxy", 1);

// ✅ Connect to Database and Auto-Fetch if empty
const News = require("./models/News");
const { fetchAndStoreOnce } = require("./services/newsFetcher");

connectDB().then(async () => {
  const count = await News.countDocuments();
  if (count === 0) {
    console.log("📭 Database is empty. Auto-fetching initial news...");
    await fetchAndStoreOnce();
  }
});

// ✅ Enable CORS before defining routes
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5500", // Fallback for local development
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ✅ Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ✅ Middleware
app.use(requestLogger);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],  // Allow inline scripts and Chart.js CDN
      scriptSrcAttr: ["'unsafe-inline'"],  // Allow onclick handlers
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
})); // Production security headers

// ✅ Routes
const viewRoutes = require('./routes/viewRoutes');

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

app.use('/', viewRoutes);
app.use('/api/auth',  authRoutes);
app.use('/api/news',  newsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes)

// ✅ Global Error Handler (Keep this last)
app.use((err, req, res, next) => {
  console.error('🔥 Global Error:', err.message);
  res.status(500).render('index', { 
    title: 'Error - NewsBite',
    news: [], 
    totalPages: 0, 
    currentPage: 1, 
    user: req.user,
    error: "Something went wrong. Please try again later."
  });
});


// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
