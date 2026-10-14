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
            "STARTER (1-PAGE) MODE: Consolidate aggressively so everything fits on 1 page. "
            "Keep the summary to 1 concise sentence (or empty string if redundant). "
            "Leave 'company_description' as an empty string '' to save vertical space. "
            "Consolidate redundant bullets into the top 2-3 highest-impact bullets per role."
            if template_type == "starter" else
            "EXPERIENCED (2-PAGE) MODE: Provide a strong 2-3 line executive summary, "
            "include a brief 1-line 'company_description' for each role, and retain 3-5 detailed bullets per role."
        )

        prompt = f"""
        You are an expert technical recruiter and ATS screening API. Extract all information from the RESUME and restructure it into our strict JSON schema.

        CRITICAL ANTI-HALLUCINATION & CONSOLIDATION RULES:
        - NEVER invent or guess dates, metrics, or company names. If a date is missing, return "".
        - NEVER guess the candidate's name. Extract the exact name from the resume.
        - ELIMINATE REDUNDANCY: Cut fluff, passive phrasing, and repetitive statements. Get straight to the point.
        - {template_rules}

        BULLET POINT REWRITE FORMULA (Wanted -> Did -> Impact):
        Every 'proposed_text' bullet MUST follow this exact 3-part structure:
        1. What was wanted/needed (the problem, goal, or system requirement)
        2. What the candidate did (the specific technical action & tools used, matching ATS keywords from the job description)
        3. The impact (the measurable or functional result, without inventing fake numbers)
        - Ban AI buzzwords ("spearheaded", "delved", "synergized", "orchestrated").

        EXTRACTION INSTRUCTIONS:
        1. contact: Extract real name, email, location, and links (GitHub/LinkedIn).
        2. education: Extract all degrees and universities.
        3. target_title: Generate a clean target title matching the job description.
        4. summary: Write a consolidated, non-redundant summary based on the mode rules.
        5. skills: Group the candidate's EXISTING technical skills into clean categories (e.g., Languages, Frameworks, Databases & Tools).
        6. missing_skills: Compare the JOB DESCRIPTION against the RESUME. Identify 3 to 6 critical skills, technologies, or domain areas required by the job that are MISSING from the candidate's resume (e.g., "C#", "Database Management", "Kubernetes"). For each missing skill, provide:
           - id: A unique string ID (e.g., "ms1", "ms2")
           - skill_name: The exact concise keyword (e.g., "PostgreSQL", "C# / .NET")
           - category: The skill category it belongs in (match one of their existing skill categories if possible, or use a clean category name like "Databases" or "Languages").
           - reason: A 1-sentence casual note telling the user why the job wants this and why adding it boosts their ATS score.
        7. experience: Extract work history and projects. Provide a short, conversational 'reason' (1-2 sentences) explaining how the Wanted -> Did -> Impact rewrite helps them.
        
        Return ONLY a JSON object matching this schema:
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
          "base_score": 65
        }}

        RESUME:
        {resume_text}

        JOB DESCRIPTION:
        {job_description}
        """

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You output strictly in JSON format."},
                {"role": "user", "content": prompt}
            ],
            model="openai/gpt-oss-120b",
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        raw_text = chat_completion.choices[0].message.content.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`").removeprefix("json").strip()
            
        return json.loads(raw_text)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))