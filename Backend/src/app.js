const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// ✅ CORS FIX (LOCAL + VERCEL)
const allowedOrigins = [
  "http://localhost:5173",
  "https://gen-ai-interview-report-generator.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps / postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed"), false);
    }
  },
  credentials: true
}));

// Routes
const authRouter = require('./routes/auth.routes');
const interviewRouter = require("./routes/interview.routes");

app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

// Test route (important for debugging)
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

module.exports = app;