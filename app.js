require("dotenv").config();
const express = require("express");
const cookieParser = require('cookie-parser')
const connectDB = require("./database/DatabaseConnection");
const authRoutes = require('./routes/authRoutes')
const newsRoutes = require('./routes/newsRoutes')
const userRoutes = require('./routes/userRoutes')
const app = express();

const PORT = process.env.PORT || 5000;
connectDB();
app.use(express.json());
app.use(express.urlencoded( {extended:true} ))
app.use(cookieParser())

app.get("/", (req, res) => {
  res.send("Welcome to the new summarizer api");
});

app.use('/api/auth',authRoutes)
app.use('/api/news',newsRoutes)
app.use('/api/user', userRoutes)


app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);

});
