const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cookieParser());

// ✅ FIXED CORS (supports local + deployed frontend)
const allowedOrigins = [
  "http://localhost:5173",
  "https://gen-ai-interview-report-generator-4.onrender.com" // change if your frontend URL is different
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

/* require all the routes here */
const authRouter = require('./routes/auth.routes');
const interviewRouter = require("./routes/interview.routes");

// using all the routes here
app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

// ✅ OPTIONAL: basic error handler (helps debugging)
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message || "Server Error" });
});

module.exports = app;