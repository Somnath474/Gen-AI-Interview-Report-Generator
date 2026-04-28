const pdfParse = require("pdf-parse");
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");


// ================== GENERATE REPORT ==================
// ================== GENERATE REPORT ==================
async function generateInterviewReportController(req, res) {
    try {
        const resumeFile = req.file;
        const { selfDescription, jobDescription } = req.body;

        // ✅ Allow either resume OR selfDescription (not both required)
        if (!resumeFile && !selfDescription?.trim()) {
            return res.status(400).json({ 
                message: "Please provide either a resume or a self description." 
            });
        }

        if (!jobDescription?.trim()) {
            return res.status(400).json({ 
                message: "Job description is required." 
            });
        }

        // ✅ Only parse PDF if file was uploaded
        let resumeText = "";
        if (resumeFile) {
            const resumeContent = await pdfParse(resumeFile.buffer);
            resumeText = resumeContent.text;
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,           // ✅ empty string if no file
            selfDescription: selfDescription || "",
            jobDescription
        });

        const interviewReport = await interviewReportModel.create({
            user: req.user?.id,
            resume: resumeText,
            selfDescription: selfDescription || "",
            jobDescription,
            title: interViewReportByAi.title || "Software Developer",
            ...interViewReportByAi
        });

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        });

    } catch (error) {
        console.error("ERROR:", error);
        res.status(500).json({ message: error.message });
    }
}

// ================== GET BY ID ==================
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params;

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user?.id
        });

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            });
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// ================== GET ALL ==================
async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user?.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v");

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// ================== GENERATE PDF ==================
async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params;

        const interviewReport = await interviewReportModel.findById(interviewReportId);

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            });
        }

        const { resume, jobDescription, selfDescription } = interviewReport;

        const pdfBuffer = await generateResumePdf({
            resume,
            jobDescription,
            selfDescription
        });

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        });

        res.send(pdfBuffer);

    } catch (error) {
        console.error("PDF ERROR:", error);
        res.status(500).json({ message: error.message });
    }
}


// ✅ EXPORT ALL (IMPORTANT)
module.exports = {
    generateInterviewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
};