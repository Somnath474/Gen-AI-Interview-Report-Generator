const interviewReportModel = require("../models/interviewReport.model")
const aiService = require("./ai.service")

// ================== GENERATE REPORT ==================
async function generateReport({ userId, resume, selfDescription, jobDescription }) {
    const interViewReportByAi = await aiService.generateInterviewReport({
        resume,
        selfDescription,
        jobDescription
    })

    const interviewReport = await interviewReportModel.create({
        user: userId,
        resume,
        selfDescription,
        jobDescription,
        title: interViewReportByAi.title || "Software Developer",
        ...interViewReportByAi
    })

    return interviewReport
}


// ================== GET BY ID ==================
async function getReportById({ interviewId, userId }) {
    const interviewReport = await interviewReportModel.findOne({
        _id: interviewId,
        user: userId
    })

    return interviewReport
}

// ================== GET ALL ==================
async function getAllReports({ userId }) {
    const interviewReports = await interviewReportModel
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .select("-resume -selfDescription -jobDescription -__v")

    return interviewReports
}

// ================== GENERATE PDF ==================
async function getResumePdf({ interviewReportId }) {
    const interviewReport = await interviewReportModel.findById(interviewReportId)

    if (!interviewReport) return null

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await aiService.generateResumePdf({
        resume,
        jobDescription,
        selfDescription
    })

    return pdfBuffer
}

module.exports = {
    generateReport,
    getReportById,
    getAllReports,
    getResumePdf
}