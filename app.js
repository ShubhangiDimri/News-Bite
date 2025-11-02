require("dotenv").config();
const express = require("express");
const connectDB = require("./database/databaseConnection");
const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.send("✅ MongoDB connected successfully via .env config!");
});

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
