import os
import json
import uuid
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

# 1. New Pydantic Models defining Bogdan's template layout
class BulletPoint(BaseModel):
    id: str
    original_text: str
    proposed_text: str
    reason: str

class Skill(BaseModel):
    category: str
    description: str

class Experience(BaseModel):
    company_name: str
    job_title: str
    company_description: str
    dates: str
    bullets: list[BulletPoint]

class ResumeData(BaseModel):
    target_title: str
    summary: str
    skills: list[Skill]
    experience: list[Experience]
    base_score: int

# 2. Updated API Endpoint
@app.post("/api/scan")
async def scan_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...)
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

        prompt = f"""
        You are an expert executive resume writer and ATS screening API. Your job is to extract the candidate's history and restructure it into a highly optimized, high-converting template format, while also generating a dynamic ATS match score (0-100).

        INSTRUCTIONS:
        1. target_title: Generate a strong target title based on the user's experience and the job description.
        2. summary: Write a punchy 2-3 line executive summary.
        3. skills: Extract 3 to 5 core skill categories. Provide the category name (e.g., "Content Strategy") and a 1-sentence description showing impact (e.g., "Developed content strategies across 5 B2B SaaS tech companies").
        4. experience: Extract their work history. For each role, provide:
           - company_name
           - job_title
           - company_description: A brief 1-line description of what the company does (e.g., "Leading B2B sales & design SaaS software for solar").
           - dates: (e.g., "2020 - PRESENT")
           - bullets: For each original bullet, provide a rewritten 'proposed_text' using strong active verbs, stripping AI buzzwords (like 'spearheaded' or 'delved'), and injecting ATS keywords. Include a short conversational 'reason' for the change.
        
        Return the response ONLY as a JSON object matching this exact schema. Generate a random UUID string for every bullet point's 'id'.
        {{
          "target_title": "string",
          "summary": "string",
          "skills": [
            {{
              "category": "string",
              "description": "string"
            }}
          ],
          "experience": [
            {{
              "company_name": "string",
              "job_title": "string",
              "company_description": "string",
              "dates": "string",
              "bullets": [
                {{
                  "id": "uuid-string-here",
                  "original_text": "Exact text from the resume",
                  "proposed_text": "The rewritten, ATS-optimized bullet point",
                  "reason": "Brief, conversational explanation of why this helps"
                }}
              ]
            }}
          ],
          "base_score": 75
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
                    "content": "You are a resume screening API that outputs strictly in JSON format."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="openai/gpt-oss-120b",
            temperature=0.2,
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