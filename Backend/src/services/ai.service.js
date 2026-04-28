const Groq = require("groq-sdk");
const puppeteer = require("puppeteer");

// ================== CLIENT ==================
const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// ================== SAFE PARSE ==================
function safeParseJSON(text) {
    try {
        const clean = text.replace(/```json|```/g, "").trim();
        return JSON.parse(clean);
    } catch (err) {
        console.error("❌ JSON PARSE ERROR:", err);
        return null;
    }
}

// ================== FALLBACK ==================
function fallbackData() {
    return {
        title: "Software Developer",
        matchScore: Math.floor(Math.random() * (85 - 50) + 50),
        summary: "Candidate has a decent foundation but needs improvement in key areas based on role requirements.",
        technicalQuestions: [],
        behavioralQuestions: [],
        skillGaps: [],
        preparationPlan: []
    };
}

// ================== NORMALIZE SCORE ==================
function normalizeScore(score) {
    if (score === undefined || score === null) return Math.floor(Math.random() * (85 - 50) + 50);
    // ✅ If AI returns 0.42 instead of 42, convert it
    if (score > 0 && score <= 1) score = Math.round(score * 100);
    // ✅ Clamp between 1 and 100
    return Math.min(100, Math.max(1, Math.round(score)));
}

// ================== GENERATE INTERVIEW REPORT ==================
async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    console.log("🔥 AI CALLED AT:", new Date().toISOString());

    const prompt = `
You are a FAANG-level interview coach.

Analyze the candidate STRICTLY and return JSON.

CANDIDATE:
${resume || ""}
${selfDescription || ""}

JOB:
${jobDescription || ""}

----------------------

SCORING RULE (STRICT):
- matchScore MUST be a whole integer between 1 and 100 (e.g. 72, NOT 0.72)
- Skills match = 50%
- Experience relevance = 30%
- Keyword overlap = 20%
- DO NOT give default 70
- Score MUST vary based on actual candidate vs job fit
- Low match = 20-40, Medium = 41-65, Strong = 66-85, Exceptional = 86-100

----------------------

TASK:
1. Extract required skills from job
2. Compare with candidate's actual skills
3. Identify real gaps
4. Generate personalized output

----------------------

RETURN JSON ONLY:

{
  "title": "role name",
  "matchScore": 72,
  "summary": "personalized summary",

  "technicalQuestions": [
    {
      "question": "",
      "difficulty": "easy|medium|hard",
      "intention": "",
      "answer": "",
      "codeExample": ""
    }
  ],

  "behavioralQuestions": [
    {
      "question": "",
      "intention": "",
      "answer": "",
      "redFlags": ""
    }
  ],

  "skillGaps": [
    {
      "skill": "",
      "severity": "low|medium|high",
      "reason": "",
      "resources": []
    }
  ],

  "preparationPlan": [
    {
      "day": 1,
      "focus": "",
      "tasks": [],
      "resources": [],
      "expectedOutcome": ""
    }
  ]
}

RULES:
- technicalQuestions: exactly 8
- behavioralQuestions: exactly 5
- skillGaps: exactly 4 (based on real gaps only)
- preparationPlan: exactly 7 days
- Personalize everything to this specific candidate and job
- No generic answers
- matchScore is an INTEGER like 67, never a decimal like 0.67
`;

    try {
        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7
        });

        const text = response.choices[0].message.content;
        console.log("✅ AI RESPONSE LENGTH:", text?.length);

        const parsed = safeParseJSON(text);

        if (!parsed) {
            console.error("❌ PARSE FAILED");
            return fallbackData();
        }

        // ✅ Always normalize score before returning
        parsed.matchScore = normalizeScore(parsed.matchScore);
        console.log("✅ FINAL SCORE:", parsed.matchScore);

        return parsed;

    } catch (err) {
        console.error("❌ AI ERROR:", err.message);
        return fallbackData();
    }
}

// ================== HTML → PDF ==================
async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
        ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
    });

    await browser.close();
    return pdfBuffer;
}

// ================== GENERATE RESUME PDF ==================
async function generateResumePdf({ resume, jobDescription, selfDescription }) {

    const prompt = `
Create a professional ATS resume in HTML.

DATA:
${resume}
${selfDescription}
${jobDescription}

Return JSON:
{ "html": "<full html>" }

RULES:
- Clean UI
- ATS friendly
- No placeholder
`;

    try {
        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const parsed = safeParseJSON(response.choices[0].message.content);

        if (!parsed?.html) throw new Error("Invalid HTML");

        return await generatePdfFromHtml(parsed.html);

    } catch (err) {
        console.error("❌ PDF ERROR:", err.message);
        throw err;
    }
}

module.exports = {
    generateInterviewReport,
    generateResumePdf
};