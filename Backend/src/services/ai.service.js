const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});


// ================== SCHEMA ==================
const interviewReportSchema = z.object({
    title: z.string(),
    matchScore: z.number().min(0).max(100),

    technicalQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })).min(3),

    behavioralQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })).min(2),

    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum(["low", "medium", "high"])
    })).min(2),

    preparationPlan: z.array(z.object({
        day: z.number(),
        focus: z.string(),
        tasks: z.array(z.string())
    })).min(3)
});


// ================== HELPER (SAFE PARSE) ==================
function safeParseJSON(text) {
    try {
        return JSON.parse(text);
    } catch (err) {
        console.error("❌ JSON PARSE ERROR:", err);
        return null;
    }
}


// ================== FALLBACK DATA ==================
function fallbackData() {
    return {
        title: "Software Developer",
        matchScore: 70,

        technicalQuestions: [
            {
                question: "Explain your main tech stack.",
                intention: "Check technical understanding",
                answer: "Explain clearly with examples"
            },
            {
                question: "What is REST API?",
                intention: "Check backend knowledge",
                answer: "Explain client-server communication"
            },
            {
                question: "What is DB indexing?",
                intention: "Performance knowledge",
                answer: "Explain optimization"
            }
        ],

        behavioralQuestions: [
            {
                question: "Tell me about yourself",
                intention: "Communication skills",
                answer: "Structured intro"
            },
            {
                question: "Biggest challenge?",
                intention: "Problem solving",
                answer: "Use STAR method"
            }
        ],

        skillGaps: [
            { skill: "System Design", severity: "high" },
            { skill: "DSA", severity: "medium" }
        ],

        preparationPlan: [
            { day: 1, focus: "DSA", tasks: ["Solve 5 problems"] },
            { day: 2, focus: "Backend", tasks: ["Revise APIs"] },
            { day: 3, focus: "Mock Interview", tasks: ["Practice"] }
        ]
    };
}


// ================== GENERATE INTERVIEW REPORT ==================
async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `
You are an expert interview coach.

Analyze the candidate and return STRICT JSON only.

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}

Rules:
- Return ONLY JSON (no text)
- Fill ALL fields
- Give at least:
  - 3 technical questions
  - 2 behavioral questions
  - 2 skill gaps
  - 3 preparation days
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(interviewReportSchema)
            }
        });

        const parsed = safeParseJSON(response.text);

        if (!parsed) return fallbackData();

        // ✅ VALIDATE USING ZOD
        const validated = interviewReportSchema.safeParse(parsed);

        if (!validated.success) {
            console.error("❌ ZOD VALIDATION FAILED:", validated.error);
            return fallbackData();
        }

        return validated.data;

    } catch (err) {
        console.error("❌ AI ERROR:", err);
        return fallbackData();
    }
}


// ================== PDF HELPER ==================
async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    });

    await browser.close();
    return pdfBuffer;
}


// ================== GENERATE RESUME PDF ==================
async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string()
    });

    const prompt = `
You are a senior FAANG-level interview coach and hiring manager.

Analyze the candidate deeply and generate a HIGHLY DETAILED interview report.

========================
CANDIDATE DATA
========================
Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}

========================
INSTRUCTIONS (VERY IMPORTANT)
========================
- Return ONLY valid JSON (NO explanation, NO text outside JSON)
- Be EXTREMELY DETAILED and SPECIFIC
- Do NOT give generic answers
- Personalize everything based on resume + job role
- Each answer must be practical, real-world, and interview-ready

========================
OUTPUT FORMAT
========================
{
  "title": "Exact job role name based on job description",

  "matchScore": number (0-100),

  "technicalQuestions": [
    {
      "question": "Advanced, role-specific technical question",
      "intention": "Why interviewer asks this (deep reasoning)",
      "answer": "STEP-BY-STEP detailed answer with examples, best practices, and mistakes to avoid"
    }
  ],

  "behavioralQuestions": [
    {
      "question": "Real behavioral interview question",
      "intention": "What skill is being tested",
      "answer": "Answer using STAR method (Situation, Task, Action, Result) with strong storytelling"
    }
  ],

  "skillGaps": [
    {
      "skill": "Specific missing skill",
      "severity": "low | medium | high",
      "improvementPlan": "How to fix this gap step-by-step with resources"
    }
  ],

  "preparationPlan": [
    {
      "day": number,
      "focus": "Specific topic (DSA / System Design / Backend / AI etc.)",
      "tasks": [
        "VERY SPECIFIC tasks (e.g., solve 5 medium LeetCode problems on trees)",
        "Watch specific concept",
        "Build mini project"
      ],
      "expectedOutcome": "What candidate will achieve after this day"
    }
  ]
}

========================
QUALITY RULES
========================
- Minimum:
  - 5 technical questions (ADVANCED level)
  - 3 behavioral questions
  - 3 skill gaps
  - 5-day preparation plan
- Avoid generic lines like "practice more"
- Give REAL actionable insights
- Answers should feel like top 1% candidate guidance

`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(resumePdfSchema)
            }
        });

        const parsed = safeParseJSON(response.text);

        if (!parsed || !parsed.html) {
            throw new Error("Invalid HTML from AI");
        }

        return await generatePdfFromHtml(parsed.html);

    } catch (err) {
        console.error("❌ PDF ERROR:", err);
        throw err;
    }
}


module.exports = {
    generateInterviewReport,
    generateResumePdf
};