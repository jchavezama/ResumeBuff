import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

load_dotenv() # Loads the variables from the .env file

# 1. Initialize the FastAPI app
app = FastAPI()

# Allow your React app to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Define the exact JSON structure we want (Kept for reference, though Groq will build it from the prompt)
class EditProposal(BaseModel):
    id: str
    original_text: str
    proposed_text: str
    reason: str

class ATSScanResult(BaseModel):
    base_score: int
    proposed_edits: list[EditProposal]

# 3. Create the API Endpoint
@app.post("/api/scan")
async def scan_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...)
):
    if not resume.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        # A. Extract text from the PDF
        reader = PdfReader(resume.file)
        resume_text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])

        # B. Initialize the Groq Client
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Groq API key not configured.")
        client = Groq(api_key=api_key)

        # C. The System Prompt 
        prompt = f"""
        You are a dual-persona expert. First, evaluate the candidate's RESUME against the JOB DESCRIPTION like a strict, enterprise Applicant Tracking System (ATS). 
        Then, explain your suggested edits like a friendly, human career coach talking directly to the candidate.

        1. Calculate a dynamic base match score from 0 to 100 based on keyword overlap, skill alignment, and formatting. 
        - BE BRUTALLY HONEST. Do not sugarcoat the score. 
        - If the resume lacks core requirements, uses weak passive verbs, or misses explicit keywords, penalize it heavily.
        2. Suggest 3 to 5 highly specific edits to the candidate's bullet points to improve their ATS score.

        RULES FOR THE REWRITTEN BULLET POINTS (proposed_text):
        - Ban AI buzzwords: Do NOT use "spearheaded," "delved," "synergized," "testament," "unleashed," "navigated," or "orchestrated."
        - Use plain English and strong active verbs (e.g., "Engineered," "Built," "Reduced," "Managed").
        - Preserve the core truth of the candidate's original bullet point. Only rephrase and inject missing ATS keywords from the job description where relevant.

        RULES FOR THE ADVICE (reason):
        - Write exactly 1 or 2 short sentences.
        - Speak directly to the user like a peer (use "I" and "you"). 
        - Sound casual, conversational, and grounded. 

        Return the response ONLY as a JSON object matching this exact schema:
        {{
          "base_score": 65,
          "proposed_edits": [
            {{
              "id": "uuid-string-here",
              "original_text": "Exact text from the resume",
              "proposed_text": "The rewritten, ATS-optimized bullet point",
              "reason": "Brief, conversational explanation of why this helps"
            }}
          ]
        }}

        RESUME:
        {resume_text}

        JOB DESCRIPTION:
        {job_description}
        """

        # D. Call Groq using JSON mode
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

        # 1. Extract and parse the JSON string
        raw_text = chat_completion.choices[0].message.content.strip()
        
        # Failsafe cleaner just in case the model wraps it in markdown blocks
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`").removeprefix("json").strip()
            
        return json.loads(raw_text)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))