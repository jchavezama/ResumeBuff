import io
import os
import re
import json
import uuid
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pydantic import BaseModel, ValidationError, model_validator
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

MODEL = "openai/gpt-oss-120b"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Response models (what the React app receives)
# ---------------------------------------------------------------------------
def _split(s: str) -> list[str]:
    return [x.strip() for x in s.split(",") if x.strip()]


class Contact(BaseModel):
    name: str = ""
    email: str = ""
    location: str = ""
    links: str = ""


class Education(BaseModel):
    institution: str = ""
    degree: str = ""


class Skill(BaseModel):
    category: str = "Skills"
    items: list[str] = []

    @model_validator(mode="before")
    @classmethod
    def coerce(cls, v):
        if isinstance(v, str):
            return {"category": "Skills", "items": _split(v)}
        if isinstance(v, dict):
            raw = v.get("items") or v.get("skills") or v.get("list") or []
            if isinstance(raw, str):
                raw = _split(raw)
            return {
                "category": v.get("category") or v.get("name") or "Skills",
                "items": [str(x) for x in raw],
            }
        return v


class BulletPoint(BaseModel):
    id: str = ""
    original_text: str = ""
    proposed_text: str = ""
    reason: str = ""


class Experience(BaseModel):
    company_name: str = ""
    job_title: str = ""
    company_description: str = ""
    dates: str = ""
    bullets: list[BulletPoint] = []


class ResumeData(BaseModel):
    contact: Contact = Contact()
    education: list[Education] = []
    target_title: str = ""
    summary: str = ""
    skills: list[Skill] = []
    experience: list[Experience] = []
    base_score: int = 0


# ---------------------------------------------------------------------------
# PDF text extraction
# ---------------------------------------------------------------------------
def clean_text(text: str) -> str:
    text = text.replace("\u200b", "").replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    lines = [ln.strip() for ln in text.splitlines()]
    text = "\n".join(lines)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def extract_text(data: bytes) -> str:
    """PyMuPDF first (much better reading order); pypdf only as a fallback."""
    text = ""
    try:
        try:
            import pymupdf as fitz  # current name
        except ImportError:
            import fitz  # older PyMuPDF versions

        with fitz.open(stream=data, filetype="pdf") as doc:
            text = "\n".join(page.get_text("text", sort=True) for page in doc)
    except Exception as e:
        print("PyMuPDF unavailable or failed, falling back to pypdf:", e)

    if len(text.strip()) < 50:
        reader = PdfReader(io.BytesIO(data))
        raw = "\n".join(t for p in reader.pages if (t := p.extract_text()))
        # pypdf often emits "word\n \nword"; glue those back together
        text = raw.replace("\n \n", " ")
    return clean_text(text)


# ---------------------------------------------------------------------------
# Deterministic fact extraction + verification helpers
# ---------------------------------------------------------------------------
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
LINK_RE = re.compile(
    r"(?:https?://)?(?:www\.)?(?:github\.com|linkedin\.com/in|gitlab\.com)/[\w\-./]+",
    re.IGNORECASE,
)


def find_email(text: str) -> str:
    m = EMAIL_RE.search(text)
    return m.group(0).rstrip(".") if m else ""


def find_links(text: str) -> str:
    seen, out = set(), []
    for m in LINK_RE.finditer(text):
        link = m.group(0).rstrip(".,;)/")
        if link.lower() not in seen:
            seen.add(link.lower())
            out.append(link)
    return " | ".join(out)


def squash(s: str) -> str:
    """Lowercase alphanumerics only, for tolerant 'is this in the resume?' checks."""
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def in_text(snippet: str, squashed_text: str) -> bool:
    sq = squash(snippet)
    return bool(sq) and sq in squashed_text


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------
def call_json(client: Groq, system: str, user: str, temperature: float = 0.1, tries: int = 2) -> dict:
    last = None
    for attempt in range(tries):
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            model=MODEL,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        raw = (completion.choices[0].message.content or "").strip()
        if raw.startswith("```"):
            raw = raw.strip("`").removeprefix("json").strip()
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
            last = ValueError("Model returned JSON that is not an object")
        except json.JSONDecodeError as e:
            last = e
            print(f"JSON parse failed (attempt {attempt + 1}):\n{raw[:1000]}")
    raise HTTPException(status_code=502, detail=f"Model returned invalid JSON: {last}")


EXTRACT_SYSTEM = "You are a precise resume parser. You output only valid JSON and never invent information."


def extract_prompt(resume_text: str) -> str:
    return f"""
Parse the RESUME below into JSON. You are only COPYING facts that are literally written in the resume. You are NOT given a job description on purpose.

Notes about the text: it comes from a PDF, so section headings can sit on the same line as the content
(e.g. "EDUCATION Arizona State University Bachelor of Science ..."), and the candidate's name is usually the first
words of the first line, immediately followed by their location (e.g. "Jane Doe Phoenix, AZ | jane@email.com").

RULES:
- name: the person's name exactly as written. Never use a placeholder or guess. If unsure, return "".
- location: city/state exactly as written, or "".
- education: institution and degree exactly as written (split the institution from the degree).
- skills: keep the resume's own category names (e.g. "Languages", "Technologies & Tools"). "items" is an array of the individual skills exactly as listed, one string each. Do not add skills that are not listed.
- experience: one entry per job OR project, in the order they appear.
    * company_name: the employer, or the project name if it is a project.
    * job_title: the job title if one is written. For a project, use the technology list written after the "|" on the project's heading (e.g. "C#, .NET"). If neither exists, "".
    * dates: ONLY if dates are literally written in the resume, otherwise "". Never guess dates.
    * bullets: an array of the bullet texts COPIED VERBATIM (join wrapped lines into one string, drop the bullet symbol). Do not rewrite, shorten, merge or add bullets.

Return ONLY this JSON shape:
{{
  "name": "",
  "location": "",
  "education": [{{"institution": "", "degree": ""}}],
  "skills": [{{"category": "", "items": ["", ""]}}],
  "experience": [{{"company_name": "", "job_title": "", "dates": "", "bullets": ["", ""]}}]
}}

RESUME:
{resume_text}
"""


REWRITE_SYSTEM = "You are an expert ATS resume optimizer. You output only valid JSON and never invent facts."


def rewrite_prompt(facts: dict, job_description: str) -> str:
    return f"""
Below are VERIFIED FACTS from a candidate's resume (JSON) and a JOB DESCRIPTION. Produce tailored content.

HARD RULES (anti-hallucination):
- Use ONLY the verified facts. Never add technologies, tools, metrics, numbers, employers, titles or years that are not in the facts.
- The job description tells you what to emphasize. It is NOT a source of facts about the candidate. Never claim a skill or specialty just because the job description mentions it.
- If a keyword from the job description is not supported by the facts, do not use it.

OUTPUT FIELDS:
- target_title: a short, honest professional title (2-5 words) that fits the candidate's real experience and is close to the job's title. No technologies the candidate does not have.
- summary: 2-3 sentences, factual, built only from the verified facts.
- base_score: integer 0-100 estimating how well the ORIGINAL resume matches the job description (skills overlap, relevant experience). Be realistic; avoid round placeholders.
- experience: for EACH experience entry, in the SAME ORDER and with the SAME NUMBER of bullets as the input:
    * company_description: one short line (max 15 words) saying what the project/company is, derived only from its bullets.
    * bullets: for each input bullet, "proposed_text" (start with a strong action verb, keep every fact and number, weave in job-description keywords ONLY where the work genuinely supports them) and "reason" (one short, friendly sentence on what improved).

Return ONLY this JSON shape:
{{
  "target_title": "",
  "summary": "",
  "base_score": 0,
  "experience": [
    {{"company_description": "", "bullets": [{{"proposed_text": "", "reason": ""}}]}}
  ]
}}

VERIFIED FACTS:
{json.dumps(facts, ensure_ascii=False)}

JOB DESCRIPTION:
{job_description}
"""


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/api/scan", response_model=ResumeData)
async def scan_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    if not (resume.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured.")

    try:
        data = await resume.read()
        resume_text = extract_text(data)
        print(f"[scan] extracted {len(resume_text)} chars. Preview:\n{resume_text[:300]}\n---")

        if len(resume_text) < 100:
            raise HTTPException(
                status_code=422,
                detail="Couldn't read text from this PDF. It may be a scanned image; please upload a text-based PDF.",
            )

        client = Groq(api_key=api_key)
        sq_text = squash(resume_text)

        # ---- STEP 1: extract facts from the resume only (no job description) ----
        facts = call_json(client, EXTRACT_SYSTEM, extract_prompt(resume_text), temperature=0.0)

        # Verify the extracted facts against the actual resume text
        name = facts.get("name") or ""
        if not in_text(name, sq_text):
            print(f"[scan] name {name!r} not found in resume text; blanking")
            name = ""
        location = facts.get("location") or ""
        if not in_text(location, sq_text):
            location = ""

        education = []
        for e in facts.get("education") or []:
            if isinstance(e, dict) and in_text(e.get("institution", ""), sq_text):
                education.append({"institution": e.get("institution", ""), "degree": e.get("degree", "")})

        skills = []
        for s in facts.get("skills") or []:
            if not isinstance(s, dict):
                continue
            raw_items = s.get("items") or []
            if isinstance(raw_items, str):
                raw_items = _split(raw_items)
            items = [str(i) for i in raw_items if in_text(str(i), sq_text)]
            if items:
                skills.append({"category": s.get("category") or "Skills", "items": items})

        verified_exp = []
        for exp in facts.get("experience") or []:
            if not isinstance(exp, dict):
                continue
            bullets = [
                str(b) for b in (exp.get("bullets") or []) if in_text(str(b), sq_text)
            ]
            dates = exp.get("dates") or ""
            if not in_text(dates, sq_text):
                dates = ""  # never keep dates that are not literally in the resume
            verified_exp.append(
                {
                    "company_name": exp.get("company_name") or "",
                    "job_title": exp.get("job_title") or "",
                    "dates": dates,
                    "bullets": bullets,
                }
            )

        verified = {
            "name": name,
            "education": education,
            "skills": skills,
            "experience": verified_exp,
        }

        # ---- STEP 2: tailor wording to the job description ----
        rewrite = call_json(
            client,
            REWRITE_SYSTEM,
            rewrite_prompt(verified, job_description[:8000]),
            temperature=0.3,
        )
        rewrite_exp = rewrite.get("experience") or []

        experience = []
        for i, exp in enumerate(verified_exp):
            rw = rewrite_exp[i] if i < len(rewrite_exp) and isinstance(rewrite_exp[i], dict) else {}
            rw_bullets = rw.get("bullets") or []
            bullets = []
            for j, original in enumerate(exp["bullets"]):
                b = rw_bullets[j] if j < len(rw_bullets) and isinstance(rw_bullets[j], dict) else {}
                bullets.append(
                    {
                        "id": str(uuid.uuid4()),
                        "original_text": original,
                        "proposed_text": b.get("proposed_text") or original,
                        "reason": b.get("reason") or "",
                    }
                )
            experience.append(
                {
                    "company_name": exp["company_name"],
                    "job_title": exp["job_title"],
                    "company_description": rw.get("company_description") or "",
                    "dates": exp["dates"],
                    "bullets": bullets,
                }
            )

        try:
            base_score = int(rewrite.get("base_score") or 0)
        except (TypeError, ValueError):
            base_score = 0

        result = ResumeData.model_validate(
            {
                # email and links come straight from regex, never from the LLM
                "contact": {
                    "name": name,
                    "email": find_email(resume_text),
                    "location": location,
                    "links": find_links(resume_text),
                },
                "education": education,
                "target_title": rewrite.get("target_title") or "",
                "summary": rewrite.get("summary") or "",
                "skills": skills,
                "experience": experience,
                "base_score": max(0, min(100, base_score)),
            }
        )
        return result

    except HTTPException:
        raise
    except ValidationError as e:
        print(e)
        raise HTTPException(status_code=502, detail="Model returned data in an unexpected format.")
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))