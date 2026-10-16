import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

load_dotenv() 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Contact(BaseModel):
    name: str
    email: str
    location: str
    links: str

class Education(BaseModel):
    institution: str
    degree: str

class Skill(BaseModel):
    category: str
    items: list[str]

class MissingSkill(BaseModel):
    id: str
    skill_name: str
    category: str
    reason: str

class BulletPoint(BaseModel):
    id: str
    original_text: str
    proposed_text: str
    reason: str
    needs_improvement: bool

class Experience(BaseModel):
    company_name: str
    job_title: str
    company_description: str
    dates: str
    bullets: list[BulletPoint]

class ResumeData(BaseModel):
    contact: Contact
    education: list[Education]
    target_title: str
    summary: str
    skills: list[Skill]
    missing_skills: list[MissingSkill]
    experience: list[Experience]
    base_score: int

@app.post("/api/scan")
async def scan_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    template_type: str = Form("starter")
):
    if not resume.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        reader = PdfReader(resume.file)
        resume_text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Groq API key not configured.")
        client = Groq(api_key=api_key)

        template_rules = (
            "STARTER (1-PAGE) MODE: Keep the summary to 1 concise sentence. "
            "Leave 'company_description' as an empty string '' to save vertical space. "
            "You MUST still include EVERY company/role from the resume, keeping the top 3 most impactful bullets per role."
            if template_type == "starter" else
            "EXPERIENCED (2-PAGE) MODE: Provide a strong 2-3 line executive summary and include a brief 1-line 'company_description' for each role. "
            "CRITICAL: You MUST include EVERY SINGLE company/role AND 100% of the bullet points from the original resume. NEVER drop, skip, or truncate any company or any bullet point!"
        )

        prompt = f"""
        You are a pragmatic, senior technical recruiter and ATS resume auditor. Extract all information from the RESUME and restructure it into our strict JSON schema.

        CRITICAL ZERO-OMISSION & ANTI-HALLUCINATION RULES:
        - EXTRACT ALL COMPANIES/ROLES: Count every work experience entry on the resume from top to bottom. Your JSON 'experience' array MUST contain 100% of the companies/roles listed on the resume. NEVER omit older jobs or stop early!
        - {template_rules}
        - NEVER invent or guess dates, metrics, or company names. If a date is missing, return "".
        - NEVER guess the candidate's name. Extract the exact name from the resume.

        RULE #1: DO NOT FORCE CHANGES ON BULLETS THAT ARE ALREADY GOOD!
        Before rewriting any bullet point, evaluate it honestly:
        - WHEN TO LEAVE IT ALONE (needs_improvement = false):
          If the original bullet point ALREADY communicates a clear action, specific technologies/methods, and a concrete result, metric, or system impact (or already follows a Wanted -> Did -> Impact / Action -> Result structure), DO NOT REWRITE IT just for the sake of changing words!
          * Set "needs_improvement": false
          * Set "proposed_text" to the EXACT same string as "original_text"
          * Set "reason" to a brief compliment (e.g., "Already strong! Clear technical action and measurable impact—no changes needed.")
        - WHEN TO REWRITE IT (needs_improvement = true):
          Only rewrite bullets that are vague, passive, duty-focused (e.g., "Responsible for...", "Worked on...", "Assisted with..."), or missing the 'why' / 'impact'.
          * Set "needs_improvement": true
          * Rewrite "proposed_text" using the Wanted -> Did -> Impact (WDI) formula below.
          * Set "reason" to explain why the original needed improvement (under 15 words).

        THE "WANTED -> DID -> IMPACT" (WDI) FORMULA (ONLY FOR WEAK BULLETS WHERE needs_improvement = true):
        1. What was wanted/needed (the goal, problem, or task)
        2. What the candidate did (the specific action and tools used, aligned with the job description)
        3. The impact (the outcome or technical benefit, without inventing fake numbers)

        EXAMPLES OF WEAK BULLETS THAT NEED WDI REWRITES:
        - Marketing: "Managed the company social media accounts and posted weekly updates." -> "Wanted to increase brand awareness, so I launched a targeted LinkedIn campaign resulting in a 45% growth in inbound leads."
        - Sales: "Responsible for cold calling prospects and closing new software deals." -> "Tasked with reversing declining Q3 sales, overhauled the pitch script to secure 15 new enterprise accounts worth $120K."
        - Engineering: "Fixed bugs in the mobile application and optimized database queries." -> "Aimed to reduce user churn caused by slow load times, refactored backend APIs, slashing latency by 35%."

        STRICT LINGUISTIC VARIETY & ANTI-REPETITION RULE:
        - When rewriting weak bullets, NEVER start every bullet with the same phrasing.
        - Within the same company section, rotate naturally between openings ("Wanted to...", "Tasked with...", "Aimed to...", "To resolve...", "Challenged with...", "Focused on...").
        - Ban robotic AI buzzwords ("spearheaded", "delved", "synergized", "orchestrated", "testament").

        EXTRACTION INSTRUCTIONS:
        1. contact: Extract real name, email, location, and links (GitHub/LinkedIn).
        2. education: Extract all degrees and universities.
        3. target_title: Generate a clean target title matching the job description.
        4. summary: Write a consolidated, non-redundant summary based on the mode rules.
        5. skills: Group the candidate's EXISTING technical skills into clean categories.
        6. missing_skills: Compare the JOB DESCRIPTION against the RESUME. Identify 0 to 5 critical skills required by the job that are genuinely MISSING from the resume. If the resume already covers the core requirements well, return an empty list []! Set 'category' to match one of the exact category names in 'skills'.
        7. experience: Extract EVERY role/project from the resume. Evaluate each bullet honestly (needs_improvement: true or false).
        8. base_score: Calculate an honest starting ATS match score (integer between 55 and 98). If the resume is already well-written and matches the job description closely, give it a high starting score (85-96)!

        Return ONLY a JSON object matching this exact schema:
        {{
          "contact": {{"name": "string", "email": "string", "location": "string", "links": "string"}},
          "education": [{{"institution": "string", "degree": "string"}}],
          "target_title": "string",
          "summary": "string",
          "skills": [{{"category": "string", "items": ["string", "string"]}}],
          "missing_skills": [
            {{"id": "ms1", "skill_name": "string", "category": "string", "reason": "string"}}
          ],
          "experience": [
            {{
              "company_name": "string", "job_title": "string", "company_description": "string", "dates": "string",
              "bullets": [
                {{
                  "id": "b1",
                  "original_text": "string",
                  "proposed_text": "string",
                  "reason": "string",
                  "needs_improvement": true
                }}
              ]
            }}
          ],
          "base_score": 78
        }}

        RESUME:
        {resume_text}

        JOB DESCRIPTION:
        {job_description}
        """

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You output strictly in valid JSON format. You NEVER omit work experience entries, and you NEVER force unnecessary rewrites on bullet points that are already strong."
                },
                {"role": "user", "content": prompt}
            ],
            model="openai/gpt-oss-120b",
            temperature=0.2,
            max_tokens=8000,
            response_format={"type": "json_object"},
        )

        raw_text = chat_completion.choices[0].message.content.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`").removeprefix("json").strip()
            
        parsed_data = json.loads(raw_text)

        raw_score = parsed_data.get("base_score", parsed_data.get("score", 72))
        try:
            parsed_data["base_score"] = max(10, min(int(float(raw_score)), 99))
        except (ValueError, TypeError):
            parsed_data["base_score"] = 72

        if "missing_skills" not in parsed_data or not isinstance(parsed_data["missing_skills"], list):
            parsed_data["missing_skills"] = []

        # Safety check: if original_text and proposed_text are identical, force needs_improvement = False
        for exp in parsed_data.get("experience", []):
            for b in exp.get("bullets", []):
                orig = (b.get("original_text") or "").strip()
                prop = (b.get("proposed_text") or "").strip()
                if orig == prop or not b.get("needs_improvement", True):
                    b["needs_improvement"] = False
                    b["proposed_text"] = orig

        return parsed_data

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))