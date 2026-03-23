const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const interviewRouter = express.Router()
const interviewController = require("../controllers/interview.controller")
const upload = require("../middlewares/file.middleware")

interviewRouter.post("/", authMiddleware.authUser, upload.single("resume"), interviewController.generateInterviewReportController)
interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllInterviewReportsController)
interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)
interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser, interviewController.generateResumePdfController)

module.exports = interviewRouter