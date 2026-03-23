const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});


// ================== SCHEMA ==================
// ✅ NO nested z.array() — Gemini can't handle them reliably
// All arrays flattened to individual string fields
const interviewReportSchema = z.object({
    title: z.string(),
    matchScore: z.number().min(0).max(100),
    summary: z.string(),

    technicalQuestions: z.array(z.object({
        question: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        intention: z.string(),
        answer: z.string(),
        codeExample: z.string()   // ✅ not optional — Gemini needs all fields required
    })).min(8),

    behavioralQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string(),
        redFlags: z.string()
    })).min(5),

    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        reason: z.string(),
        resourceOne: z.string(),    // ✅ flattened — no nested array
        resourceTwo: z.string(),
        resourceThree: z.string()
    })).min(4),

    preparationPlan: z.array(z.object({
        day: z.number(),
        focus: z.string(),
        taskOne: z.string(),        // ✅ flattened — no nested array
        taskTwo: z.string(),
        taskThree: z.string(),
        taskFour: z.string(),
        resourceOne: z.string(),    // ✅ flattened
        resourceTwo: z.string(),
        expectedOutcome: z.string()
    })).min(7)
});


// ================== RESHAPE ==================
// ✅ After AI responds, reshape flat fields back into arrays
function reshapeAiResponse(data) {
    return {
        title: data.title,
        matchScore: data.matchScore,
        summary: data.summary,

        technicalQuestions: data.technicalQuestions,

        behavioralQuestions: data.behavioralQuestions,

        skillGaps: data.skillGaps.map(gap => ({
            skill: gap.skill,
            severity: gap.severity,
            reason: gap.reason,
            resources: [gap.resourceOne, gap.resourceTwo, gap.resourceThree].filter(Boolean)
        })),

        preparationPlan: data.preparationPlan.map(day => ({
            day: day.day,
            focus: day.focus,
            tasks: [day.taskOne, day.taskTwo, day.taskThree, day.taskFour].filter(Boolean),
            resources: [day.resourceOne, day.resourceTwo].filter(Boolean),
            expectedOutcome: day.expectedOutcome
        }))
    }
}


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

Deeply analyze this candidate and generate the most DETAILED, PERSONALIZED, ACTIONABLE interview preparation report possible.

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
Generate a comprehensive interview report with ALL of these:

1. TITLE — Exact role name from the job description

2. MATCH SCORE — Honest 0-100 score based on how well candidate fits this specific role

3. SUMMARY — 3-4 sentences on candidate's key strengths and biggest gaps for THIS role

4. TECHNICAL QUESTIONS — exactly 8, mix of easy/medium/hard:
   - Must be specific to the technologies in the job description
   - Real-world scenario-based
   - Step-by-step detailed answers (minimum 5 sentences each)
   - Include code in codeExample where relevant, else leave empty string ""
   - Explain deeply WHY interviewer asks this

5. BEHAVIORAL QUESTIONS — exactly 5:
   - Based on company culture and seniority level
   - Full STAR method answers (minimum 5 sentences)
   - redFlags: what NOT to say and why

6. SKILL GAPS — exactly 4:
   - Specific to this job role
   - Honest reason why it's a gap
   - resourceOne, resourceTwo, resourceThree: specific course/book/website names

7. PREPARATION PLAN — exactly 7 days:
   - taskOne, taskTwo, taskThree, taskFour: very specific actionable tasks
   - resourceOne, resourceTwo: specific URLs or book names
   - expectedOutcome: what the candidate will be able to do after this day

========================
RULES
========================
- Return ONLY valid JSON — no extra text
- All string fields must be non-empty
- Personalize EVERYTHING to this candidate's resume and job description
- Answers must be detailed, impressive, and interview-ready
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

        console.log("✅ RAW AI RESPONSE:", response.text)   // ← check terminal

        const parsed = safeParseJSON(response.text);
        if (!parsed) {
            console.error("❌ PARSE FAILED — returning fallback")
            return fallbackData();
        }

        const validated = interviewReportSchema.safeParse(parsed);
        if (!validated.success) {
            console.error("❌ ZOD FAILED:", JSON.stringify(validated.error, null, 2))
            return fallbackData();
        }

        // ✅ Reshape flat fields back into arrays before returning
        return reshapeAiResponse(validated.data);

    } catch (err) {
        console.error("❌ AI ERROR:", err);
        return fallbackData();
    }
}


// ================== PDF HELPER ==================
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

    const resumePdfSchema = z.object({
        html: z.string()
    });

    const prompt = `
You are a world-class resume designer and career coach.

Create a stunning, ATS-optimized HTML resume for this candidate targeting the job below.

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
- Return ONLY { "html": "..." } — no extra text whatsoever
- The HTML must be 100% complete and self-contained
- All CSS must be inside a <style> tag in <head> — no external files
- Must look great printed to A4 PDF

========================
DESIGN REQUIREMENTS
========================
- Color: Deep navy (#1a237e) header, white body
- Font: Import 'Inter' from Google Fonts CDN
- Sections in order: Header (name+contact), Summary, Skills, Experience, Projects, Education
- Skills: render as pill/tag badges
- Contact icons: use Font Awesome 6 CDN
- Experience items: subtle left border in navy
- Quantify all achievements from resume data
- Summary: tailored to the job description keywords
- Professional, clean, impressive — like a top designer made it

========================
STRICT RULES
========================
- HTML must start with <!DOCTYPE html>
- Return ONLY the JSON object { "html": "..." }
- Every section must be populated with real data from the candidate
- No placeholder text like "Your Name" or "Company Name"
`

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(resumePdfSchema)
            }
        });

        console.log("✅ PDF AI RESPONSE LENGTH:", response.text?.length)  // ← check terminal

        const parsed = safeParseJSON(response.text);

        if (!parsed || !parsed.html) {
            throw new Error("❌ Invalid or empty HTML from AI")
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