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
            "You MUST still include EVERY company/role from the resume, but consolidate each role to its top 3 most impactful bullets."
            if template_type == "starter" else
            "EXPERIENCED (2-PAGE) MODE: Provide a strong 2-3 line executive summary and include a brief 1-line 'company_description' for each role. "
            "CRITICAL: You MUST include EVERY SINGLE company/role AND 100% of the bullet points from the original resume. NEVER drop, skip, or truncate any company or any bullet point!"
        )

        prompt = f"""
        You are an expert technical recruiter and ATS resume writer. Extract all information from the RESUME and restructure it into our strict JSON schema.

        CRITICAL ZERO-OMISSION & ANTI-HALLUCINATION RULES:
        - EXTRACT ALL COMPANIES/ROLES: Count every work experience entry on the resume from top to bottom. Your JSON 'experience' array MUST contain 100% of the companies/roles listed on the resume. NEVER omit older jobs or stop early!
        - {template_rules}
        - NEVER invent or guess dates, metrics, or company names. If a date is missing, return "".
        - NEVER guess the candidate's name. Extract the exact name from the resume.

        CUSTOMIZE EVERY BULLET WITH THE "WANTED -> DID -> IMPACT" (WDI) FORMULA:
        Customize each existing bullet point on the resume into an achievement-focused WDI statement that weaves together:
        1. What was wanted/needed (the goal, problem, or task)
        2. What the candidate did (the specific action and tools used, aligned with the job description)
        3. The impact (the outcome or technical benefit, keeping any real metrics from the original text without inventing fake percentages)

        STUDY THESE BEFORE vs. AFTER EXAMPLES OF GREAT WDI REWRITES:
        - Marketing Example:
          Before (Duty-Focused): "Managed the company social media accounts and posted weekly updates."
          After (WDI Achievement-Focused): "Wanted to increase brand awareness, so I launched a targeted LinkedIn campaign resulting in a 45% growth in inbound leads."
        - Sales Example:
          Before (Duty-Focused): "Responsible for cold calling prospects and closing new software deals."
          After (WDI Achievement-Focused): "Tasked with reversing declining Q3 sales, overhauled the pitch script to secure 15 new enterprise accounts worth $120K."
        - Engineering Example:
          Before (Duty-Focused): "Fixed bugs in the mobile application and optimized database queries."
          After (WDI Achievement-Focused): "Aimed to reduce user churn caused by slow load times, refactored backend APIs, slashing latency by 35%."

        STRICT LINGUISTIC VARIETY & ANTI-REPETITION RULE:
        - DO NOT start every bullet point with the same phrasing!
        - Within the same work experience/company section, EVERY bullet point MUST use a DIFFERENT opening hook and transition style. Rotate naturally between openings like:
          * "Wanted to [goal], so I [action], resulting in [impact]."
          * "Tasked with [challenge], [action] to achieve [impact]."
          * "Aimed to [objective], [action], [impact]."
          * "To resolve/eliminate [problem], [action], which [impact]."
          * "Challenged with [need], [action], enabling [impact]."
          * "Focused on improving [area] by [action], driving [impact]."
        - Reusing an opening phrase style is ONLY acceptable if it is under a DIFFERENT work experience section.
        - Ban robotic AI buzzwords ("spearheaded", "delved", "synergized", "orchestrated", "testament").

        EXTRACTION INSTRUCTIONS:
        1. contact: Extract real name, email, location, and links (GitHub/LinkedIn).
        2. education: Extract all degrees and universities.
        3. target_title: Generate a clean target title matching the job description.
        4. summary: Write a consolidated, non-redundant summary based on the mode rules.
        5. skills: Group the candidate's EXISTING technical skills into clean categories (e.g., "Languages", "Frontend & UI", "Backend & Architecture", "Cloud & DevOps", "Data & Messaging").
        6. missing_skills: Compare the JOB DESCRIPTION against the RESUME. Identify 3 to 6 critical skills, tools, or domain areas required by the job that are MISSING from the resume.
           - IMPORTANT: Set each missing skill's 'category' to match one of the EXACT category names you used in 'skills' above so it merges cleanly when added.
        7. experience: Extract EVERY role/project from the resume without exception, and customize each of its bullets using varied WDI language. Keep each bullet's 'reason' concise (under 15 words) so the full work history is never truncated.
        8. base_score: Calculate an honest starting ATS match score as an integer between 55 and 82 (e.g., 68).

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
              "bullets": [{{"id": "b1", "original_text": "string", "proposed_text": "string", "reason": "string"}}]
            }}
          ],
          "base_score": 68
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
                    "content": "You output strictly in valid JSON format. You NEVER omit or truncate work experience entries from the resume."
                },
                {"role": "user", "content": prompt}
            ],
            model="openai/gpt-oss-120b",
            temperature=0.25,
            max_tokens=8000, # Prevents output cutoff on multi-page resumes
            response_format={"type": "json_object"},
        )

        raw_text = chat_completion.choices[0].message.content.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`").removeprefix("json").strip()
            
        parsed_data = json.loads(raw_text)

        raw_score = parsed_data.get("base_score", parsed_data.get("score", 68))
        try:
            parsed_data["base_score"] = max(10, min(int(float(raw_score)), 95))
        except (ValueError, TypeError):
            parsed_data["base_score"] = 68

        if "missing_skills" not in parsed_data or not isinstance(parsed_data["missing_skills"], list):
            parsed_data["missing_skills"] = []

        return parsed_data

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))