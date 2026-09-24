import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
load_dotenv() # Loads the variables from the .env file
import time

# 1. Initialize the FastAPI app
app = FastAPI()

# Allow your React app (running on localhost:5173) to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change this to your Appwrite domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Define the exact JSON structure we want Gemini to return
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
    # Ensure the uploaded file is a PDF
    if not resume.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        # A. Extract text from the PDF
        reader = PdfReader(resume.file)
        resume_text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])

        # B. Initialize the Gemini Client
        api_key = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)

        # C. The System Prompt (We will expand this later, keeping it simple for now)
        # C. The System Prompt
        prompt = f"""
        You are a dual-persona expert. First, evaluate the candidate's RESUME against the JOB DESCRIPTION like a strict, enterprise Applicant Tracking System (ATS). 
        Then, explain your suggested edits like a friendly, human career coach talking directly to the candidate.

        1. Calculate a dynamic base match score from 0 to 100 based on keyword overlap, skill alignment, and formatting. 
        - BE BRUTALLY HONEST. Do not sugarcoat the score. 
        - If the resume lacks core requirements, uses weak passive verbs, or misses explicit keywords, penalize it heavily. It is completely acceptable and encouraged to return a score of 20, 30, or 40 for a weak resume.
        2. Suggest 3 to 5 highly specific edits to the candidate's bullet points to improve their ATS score.

        RULES FOR THE REWRITTEN BULLET POINTS (proposed_text):
        - Ban AI buzzwords: Do NOT use "spearheaded," "delved," "synergized," "testament," "unleashed," "navigated," or "orchestrated."
        - Use plain English and strong active verbs (e.g., "Engineered," "Built," "Reduced," "Managed").
        - Preserve the core truth of the candidate's original bullet point. Only rephrase and inject missing ATS keywords from the job description where relevant.

        RULES FOR THE ADVICE (reason):
        - Write exactly 1 or 2 short sentences.
        - Speak directly to the user like a peer (use "I" and "you"). 
        - Sound casual, conversational, and grounded. 
        - Example Good Reason: "I added 'React' here so the scanner catches your frontend skills right away."
        - Example Bad Reason: "This modification successfully integrates the required React competency to optimize algorithmic parsing."
        - Ban formal transitions: Do NOT use "Furthermore," "Crucially," "Additionally," or "It is important to note."

        Return the response ONLY as a JSON object matching this exact schema (NOTE: The base_score of 65 is just a placeholder. You MUST replace it with your own brutally honest, dynamically calculated integer):
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

        # D. Call Gemini and enforce our specific JSON schema with an auto-retry
        import time
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model='gemini-3.6-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=ATSScanResult,
                        temperature=0.2, 
                    ),
                )
                break # If successful, break out of the retry loop
                
            except Exception as api_error:
                if "503" in str(api_error) and attempt < max_retries - 1:
                    print(f"Google API busy. Retrying attempt {attempt + 2}...")
                    time.sleep(2) # Wait 2 seconds before trying again
                    continue
                else:
                    raise api_error # If it's not a 503 or we are out of retries, crash normally

        # 1. Clean the text in case Gemini wraps it in ```json ... ``` markdown
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`").removeprefix("json").strip()
            
        import json
        return json.loads(raw_text)
        

    except Exception as e:
        # 2. Print the exact error trace to your terminal so we can read it
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))