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
    summary: z.string(),  // ✅ new — candidate strength summary

    technicalQuestions: z.array(z.object({
        question: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]),  // ✅ new
        intention: z.string(),
        answer: z.string(),
        codeExample: z.string().optional()               // ✅ new — code if relevant
    })).min(8),                                          // ✅ was 3, now 8

    behavioralQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string(),                              // full STAR answer
        redFlags: z.string()                             // ✅ new — what NOT to say
    })).min(5),                                          // ✅ was 2, now 5

    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        reason: z.string(),                              // ✅ new — why it's a gap
        resources: z.array(z.string())                  // ✅ new — fix resources
    })).min(4),                                          // ✅ was 2, now 4

    preparationPlan: z.array(z.object({
        day: z.number(),
        focus: z.string(),
        tasks: z.array(z.string()).min(4),               // ✅ min 4 tasks per day
        resources: z.array(z.string()),                  // ✅ new — links/books
        expectedOutcome: z.string()                      // ✅ new — what you'll achieve
    })).min(7)                                           // ✅ was 3, now full 7 days
});


// ================== SAFE PARSE ==================
function safeParseJSON(text) {
    try {
        return JSON.parse(text);
    } catch (err) {
        console.error("❌ JSON PARSE ERROR:", err);
        return null;
    }
}


// ================== FALLBACK ==================
function fallbackData() {
    return {
        title: "Software Developer",
        matchScore: 70,
        summary: "Candidate has a solid foundation. Focus on DSA and system design to crack top companies.",

        technicalQuestions: [
            { question: "Explain event loop in Node.js", difficulty: "medium", intention: "Check async understanding", answer: "Node.js uses a single-threaded event loop...", codeExample: "" },
            { question: "What is closure in JavaScript?", difficulty: "easy", intention: "Core JS knowledge", answer: "A closure is a function that retains access to its outer scope...", codeExample: "const counter = () => { let count = 0; return () => ++count }" },
            { question: "Explain REST vs GraphQL", difficulty: "medium", intention: "API design knowledge", answer: "REST uses fixed endpoints, GraphQL uses a single endpoint with flexible queries", codeExample: "" },
            { question: "What is database indexing?", difficulty: "medium", intention: "DB performance knowledge", answer: "Indexing creates a data structure for faster lookups...", codeExample: "" },
            { question: "Explain JWT authentication", difficulty: "medium", intention: "Security knowledge", answer: "JWT consists of header, payload, signature encoded in base64...", codeExample: "" },
            { question: "What is the difference between SQL and NoSQL?", difficulty: "easy", intention: "Database knowledge", answer: "SQL is relational with fixed schema, NoSQL is flexible...", codeExample: "" },
            { question: "Explain SOLID principles", difficulty: "hard", intention: "OOP and architecture knowledge", answer: "Single responsibility, Open/closed, Liskov substitution...", codeExample: "" },
            { question: "What is memoization?", difficulty: "medium", intention: "Optimization knowledge", answer: "Caching results of expensive function calls...", codeExample: "" }
        ],

        behavioralQuestions: [
            { question: "Tell me about yourself", intention: "Communication skills", answer: "I am a software developer with X years of experience...", redFlags: "Don't recite your resume — tell a story" },
            { question: "Describe your biggest technical challenge", intention: "Problem solving", answer: "Using STAR method — Situation, Task, Action, Result...", redFlags: "Don't blame teammates" },
            { question: "How do you handle tight deadlines?", intention: "Time management", answer: "I prioritize tasks using MoSCoW method...", redFlags: "Don't say you work overtime always" },
            { question: "Tell me about a time you failed", intention: "Self-awareness", answer: "I once underestimated API rate limits...", redFlags: "Don't say you've never failed" },
            { question: "Where do you see yourself in 5 years?", intention: "Ambition and retention", answer: "I want to grow into a senior/lead role...", redFlags: "Don't say you want to start your own company immediately" }
        ],

        skillGaps: [
            { skill: "System Design", severity: "high", reason: "Not mentioned in resume", resources: ["Grokking System Design", "System Design Primer GitHub"] },
            { skill: "DSA", severity: "high", reason: "No competitive programming mentioned", resources: ["LeetCode", "NeetCode.io"] },
            { skill: "Docker & Kubernetes", severity: "medium", reason: "DevOps skills missing", resources: ["Docker docs", "KodeKloud"] },
            { skill: "Testing (Jest/Mocha)", severity: "low", reason: "No testing experience mentioned", resources: ["Jest docs", "Testing JS course"] }
        ],

        preparationPlan: [
            { day: 1, focus: "DSA - Arrays & Strings", tasks: ["Solve 10 easy LeetCode problems", "Revise time complexity", "Watch NeetCode arrays playlist", "Implement binary search from scratch"], resources: ["LeetCode", "NeetCode.io"], expectedOutcome: "Comfortable with array manipulation problems" },
            { day: 2, focus: "DSA - Trees & Graphs", tasks: ["Solve 5 tree problems", "Implement BFS and DFS", "Solve 3 graph problems", "Revise recursion"], resources: ["LeetCode", "Visualgo.net"], expectedOutcome: "Able to traverse any tree/graph structure" },
            { day: 3, focus: "System Design Basics", tasks: ["Study load balancing", "Learn CAP theorem", "Design a URL shortener", "Study database sharding"], resources: ["Grokking System Design", "System Design Primer"], expectedOutcome: "Can design a basic scalable system" },
            { day: 4, focus: "Backend & APIs", tasks: ["Revise REST principles", "Build a CRUD API", "Study JWT & OAuth", "Learn rate limiting"], resources: ["MDN Docs", "Postman Docs"], expectedOutcome: "Confident in API design questions" },
            { day: 5, focus: "Database Deep Dive", tasks: ["Study indexing in depth", "Practice SQL joins", "Learn MongoDB aggregation", "Optimize slow queries"], resources: ["SQLZoo", "MongoDB University"], expectedOutcome: "Can answer any DB performance question" },
            { day: 6, focus: "Behavioral & HR Round", tasks: ["Prepare 10 STAR stories", "Research company culture", "Prepare questions to ask interviewer", "Do a mock interview"], resources: ["Glassdoor", "LinkedIn"], expectedOutcome: "Confident and compelling in behavioral round" },
            { day: 7, focus: "Full Mock Interview", tasks: ["Solve 3 medium LeetCode problems", "Do a full system design mock", "Revise all notes", "Rest and stay confident"], resources: ["Pramp.com", "Interviewing.io"], expectedOutcome: "Interview-ready with full confidence" }
        ]
    };
}


// ================== GENERATE INTERVIEW REPORT ==================
async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `
You are a FAANG-level senior hiring manager and interview coach with 15+ years of experience.

Your job is to deeply analyze this candidate and generate the most DETAILED, PERSONALIZED, and ACTIONABLE interview preparation report possible.

========================
CANDIDATE PROFILE
========================
Resume:
${resume}

Self Description:
${selfDescription}

Target Job Description:
${jobDescription}

========================
YOUR TASK
========================
Generate a comprehensive interview report with:

1. TITLE — Exact role name from job description

2. MATCH SCORE — Honest 0-100 score based on how well candidate fits

3. SUMMARY — 3-4 sentence paragraph highlighting candidate's key strengths and biggest gaps for THIS specific role

4. TECHNICAL QUESTIONS (minimum 8, mix of easy/medium/hard):
   - MUST be highly specific to the job description technologies
   - Include real-world scenario-based questions
   - Give step-by-step detailed answers
   - Include code examples where relevant
   - Explain WHY interviewer asks this

5. BEHAVIORAL QUESTIONS (minimum 5):
   - Based on company culture and job level
   - Full STAR method answers
   - Include red flags — what NOT to say

6. SKILL GAPS (minimum 4):
   - Be brutally honest
   - Explain exactly why it's a gap for THIS role
   - Give 2-3 specific resources to fix each gap

7. 7-DAY PREPARATION PLAN:
   - Day-by-day, topic-specific plan
   - Minimum 4 tasks per day
   - Include specific resources (books, courses, websites)
   - Include expected outcome per day
   - Make it realistic and achievable

========================
STRICT RULES
========================
- Return ONLY valid JSON matching the schema — no extra text
- Be EXTREMELY specific — no generic advice
- Personalize EVERYTHING based on the resume and job description
- Technical question answers must be interview-ready, detailed, and impressive
- The 7-day plan must feel like it was made by a personal coach
`

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
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
    });

    await browser.close();
    return pdfBuffer;
}


// ================== GENERATE RESUME PDF ==================
// ✅ Fixed — prompt now correctly asks for HTML resume, not interview report JSON
async function generateResumePdf({ resume, jobDescription, selfDescription }) {

    const prompt = `
You are a world-class resume designer and career coach.

Create a stunning, ATS-optimized, single-page HTML resume for this candidate targeting the job below.

========================
CANDIDATE DATA
========================
Resume Content:
${resume}

Self Description:
${selfDescription}

Target Job Description:
${jobDescription}

========================
INSTRUCTIONS
========================
- Return ONLY a JSON object: { "html": "<full html string>" }
- The HTML must be complete, self-contained with inline CSS
- Make it visually impressive — like a top 1% resume
- ATS friendly — use proper headings and keywords from job description
- Single page A4 layout
- Use a clean, modern, professional design

========================
DESIGN REQUIREMENTS
========================
- Color scheme: Deep navy (#1a237e) header with white text, clean white body
- Font: Use Google Font 'Inter' via CDN link
- Sections: Summary, Skills, Experience, Projects, Education
- Skills: Show as modern tags/pills
- Use icons from CDN (font-awesome) for contact info
- Add a subtle left border accent on experience items
- Quantify achievements wherever possible based on resume content
- Tailor the summary specifically to the job description keywords
- Make it look like it was designed by a professional designer

========================
STRICT RULES
========================
- Return ONLY { "html": "..." } — no extra text
- HTML must be complete with <!DOCTYPE html> tag
- All CSS must be inline in a <style> tag in <head>
- Must look great when printed to A4 PDF
`

    try {
        const resumePdfSchema = z.object({
            html: z.string()
        });

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