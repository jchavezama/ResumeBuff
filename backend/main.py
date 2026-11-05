import os
import re
import json
import time
import asyncio
from difflib import SequenceMatcher

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


# ---------------------------------------------------------------------------
# Tuning knobs
# ---------------------------------------------------------------------------
GAP_PENALTY = 4        # points off the starting score per real missing skill
WEAK_BULLET_PENALTY = 2  # points off per bullet that genuinely needs a rewrite
MIN_SCORE = 55
MAX_SCORE = 99         # a resume with nothing to fix lands here
SIMILARITY_LIMIT = 0.85  # rewrites this close to the original are discarded

VALID_DEFECTS = {"duty_focused", "no_outcome", "vague"}
GENERIC_STRONG_REASON = (
    "Already strong! Clear action and measurable impact, so no changes needed."
)
NUM_RE = re.compile(r"\d[\d,\.]*")


def run_llm(
    client: Groq, system: str, user: str, max_tokens: int, effort: str = "low"
) -> dict:
    """One LLM call that returns parsed JSON. Logs time + token usage."""
    t = time.time()
    resp = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        temperature=0,  # same resume + same JD should give the same answer
        max_tokens=max_tokens,
        reasoning_effort=effort,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    print(
        f"LLM call: {time.time() - t:.1f}s, "
        f"{resp.usage.completion_tokens} output tokens"
    )

    raw_text = (resp.choices[0].message.content or "").strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`").removeprefix("json").strip()
    return json.loads(raw_text)


# ---------------------------------------------------------------------------
# Post-processing guards (these enforce "leave good bullets alone" in code,
# so we don't depend only on the model's judgment)
# ---------------------------------------------------------------------------
def numbers_in(text: str) -> set[str]:
    return {n.strip(".,") for n in NUM_RE.findall(text or "")}


def should_keep_original(b: dict, resume_numbers: set[str]) -> bool:
    orig = (b.get("original_text") or "").strip()
    prop = (b.get("proposed_text") or "").strip()

    # Model said it's fine, or gave no real rewrite
    if not b.get("needs_improvement", False):
        return True
    if not prop or prop == orig:
        return True

    # Model must name a specific defect to justify a rewrite
    if b.get("defect") not in VALID_DEFECTS:
        return True

    # Already has a concrete number, so it already shows impact
    if numbers_in(orig):
        return True

    # Rewrite is basically the same sentence reworded
    if SequenceMatcher(None, orig.lower(), prop.lower()).ratio() > SIMILARITY_LIMIT:
        return True

    # Rewrite introduces numbers that are not anywhere in the resume
    if numbers_in(prop) - resume_numbers:
        return True

    return False


def clean_missing_skills(raw, resume_text: str, categories: list[str]) -> list[dict]:
    """Drop false gaps: skills the resume already covers, or empty entries."""
    low = resume_text.lower()
    cleaned = []

    for m in raw if isinstance(raw, list) else []:
        name = (m.get("skill_name") or "").strip()
        if not name:
            continue

        # Model named a resume item that already covers this requirement
        if (m.get("on_resume_equivalent") or "").strip():
            continue

        # The skill's name literally appears in the resume
        core = re.sub(
            r"\b(framework|frameworks|experience|skills?|knowledge|proficiency)\b",
            "",
            name.lower(),
        ).strip(" -–,/")
        if core and re.search(
            rf"(?<![a-z0-9]){re.escape(core)}(?![a-z0-9])", low
        ):
            continue

        # Category must exist so "Add to Resume" has somewhere to put it
        if categories and m.get("category") not in categories:
            m["category"] = categories[0]

        cleaned.append(m)

    cleaned = cleaned[:5]
    for n, m in enumerate(cleaned, 1):
        m["id"] = f"ms{n}"
        m.pop("on_resume_equivalent", None)
        m.pop("jd_quote", None)
    return cleaned


@app.post("/api/scan")
async def scan_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    template_type: str = Form("starter"),
):
    if not (resume.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        reader = PdfReader(resume.file)
        pages = [page.extract_text() or "" for page in reader.pages]
        resume_text = "\n".join(p for p in pages if p.strip())

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Groq API key not configured.")
        client = Groq(api_key=api_key)

        starter = template_type == "starter"

        summary_rule = (
            "Keep the summary to 1 concise sentence."
            if starter
            else "Write a strong 2-3 line executive summary."
        )
        exp_rule = (
            "STARTER MODE: set 'company_description' to ''. Include EVERY role, "
            "keeping the top 3 most impactful bullets per role."
            if starter
            else "EXPERIENCED MODE: add a brief 1-line 'company_description' per role. "
            "Include EVERY role and 100% of the bullets. Never drop any."
        )

        profile_prompt = f"""
You are a pragmatic senior technical recruiter and ATS auditor. Extract profile data from the RESUME and compare it to the JOB DESCRIPTION.

RULES:
- Never invent or guess names, dates, or metrics. Use "" if missing. Extract the exact name.
- {summary_rule}

Fields:
1. contact: real name, email, location, links.
2. education: all degrees and universities.
3. target_title: clean title matching the job description.
4. summary: consolidated, non-redundant, no invented claims.
5. skills: group the candidate's EXISTING skills into clean categories.
6. missing_skills: skills the job description REQUIRES that the resume does not show. DEFAULT TO AN EMPTY LIST []. An empty list is a good, correct result.
   Only list a skill if ALL of these are true:
   - The job description states it as a requirement (not "preferred", "nice to have", "bonus", or "a plus").
   - Nothing on the resume covers it. Check synonyms and equivalents first (e.g. "Postgres" = PostgreSQL, "K8s" = Kubernetes, "CI/CD" is covered by GitHub Actions or Jenkins).
   - If the job lists alternatives ("React or Angular", "Cypress or Playwright", "AWS or GCP"), it is satisfied when the resume has ANY ONE of them. Do not list the others as missing.
   For each entry, fill "jd_quote" with the short phrase from the job description that requires it, and "on_resume_equivalent" with the resume item that already covers it, or "" if truly nothing does. 'category' must match a category name in 'skills'. Maximum 5.

Return ONLY JSON:
{{"contact":{{"name":"","email":"","location":"","links":""}},
"education":[{{"institution":"","degree":""}}],
"target_title":"","summary":"",
"skills":[{{"category":"","items":[""]}}],
"missing_skills":[{{"skill_name":"","category":"","jd_quote":"","on_resume_equivalent":"","reason":""}}]}}

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""

        experience_prompt = f"""
You are a pragmatic senior technical recruiter. Extract EVERY work experience entry from the RESUME, top to bottom, and evaluate each bullet.

RULES:
- {exp_rule}
- Never invent dates, metrics, employers, or tools. Use "" if a date is missing.
- Copy each bullet's "original_text" exactly as written in the resume.

BULLET DECISION: THE DEFAULT IS KEEP.
Most good resumes need few or no rewrites. Returning ZERO rewrites is a correct, successful result. Never rewrite a bullet to polish wording, swap verbs, add job-description keywords, or make it sound more impressive. If the original already works, leave it alone.

A bullet is STRONG (needs_improvement=false) when it has a specific action, names a concrete system, tool, method or scope, and shows an outcome, purpose, scale or result. A numeric metric is NOT required. A bullet that already follows Wanted -> Did -> Impact (for example it opens with "Wanted to", "Tasked with", "Aimed to", "To resolve", "Challenged with", "Focused on") is STRONG.
For strong bullets: needs_improvement=false, defect="none", "proposed_text" is an EMPTY STRING, and "reason" is a short (under 12 words) specific compliment.

A bullet is WEAK (needs_improvement=true) ONLY if it has one of these specific defects, which you must name in "defect":
- "duty_focused": opens with Responsible for / Worked on / Assisted with / Helped / Handled / Involved in AND states no outcome.
- "no_outcome": names an action but gives no result, purpose or scale at all.
- "vague": names no specific tool, system or method.
If you cannot name one of these three defects, the bullet is STRONG. When unsure, KEEP IT.

For weak bullets, rewrite "proposed_text" using Wanted -> Did -> Impact: the goal or problem, what the candidate did (use tools the resume already shows), and the outcome. Do NOT add numbers, tools, or claims that are not in the resume. Set "reason" to under 15 words explaining the defect.
Vary openings within a company ("Wanted to...", "Tasked with...", "Aimed to...", "To resolve...", "Focused on..."). Never use: spearheaded, delved, synergized, orchestrated, testament.

Return ONLY JSON:
{{"experience":[{{"company_name":"","job_title":"","company_description":"","dates":"",
"bullets":[{{"original_text":"","needs_improvement":false,"defect":"none","proposed_text":"","reason":""}}]}}]}}

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""

        system_msg = (
            "You output strictly valid JSON. You never omit work experience entries. "
            "You are conservative: bullets that already work are left untouched, "
            "and you never rewrite just to change wording."
        )

        # Run both calls at the same time
        profile, experience = await asyncio.gather(
            asyncio.to_thread(run_llm, client, system_msg, profile_prompt, 2000, "low"),
            asyncio.to_thread(
                run_llm, client, system_msg, experience_prompt, 6000, "low"
            ),
        )

        parsed_data = {**profile, "experience": experience.get("experience", [])}

        # Missing skills: drop false gaps, assign IDs
        categories = [
            s.get("category")
            for s in parsed_data.get("skills", [])
            if isinstance(s, dict) and s.get("category")
        ]
        parsed_data["missing_skills"] = clean_missing_skills(
            parsed_data.get("missing_skills"), resume_text, categories
        )

        # Bullets: assign IDs and enforce keep-by-default
        resume_numbers = numbers_in(resume_text)
        weak_count = 0
        for i, exp in enumerate(parsed_data["experience"]):
            for j, b in enumerate(exp.get("bullets", [])):
                b["id"] = f"b{i}_{j}"
                orig = (b.get("original_text") or "").strip()
                was_flagged = bool(b.get("needs_improvement", False))

                if should_keep_original(b, resume_numbers):
                    b["needs_improvement"] = False
                    b["proposed_text"] = orig
                    # If we overrode a rewrite, the model's reason no longer fits
                    if was_flagged or not b.get("reason"):
                        b["reason"] = GENERIC_STRONG_REASON
                else:
                    weak_count += 1
                b.pop("defect", None)

        # Score comes from what we actually found, not a model guess, so the
        # same resume gets the same score every time. Nothing to fix = top score.
        gap_count = len(parsed_data["missing_skills"])
        score = 100 - GAP_PENALTY * gap_count - WEAK_BULLET_PENALTY * weak_count
        parsed_data["base_score"] = max(MIN_SCORE, min(score, MAX_SCORE))

        print(
            f"Result: {weak_count} bullets to rewrite, {gap_count} missing skills, "
            f"score {parsed_data['base_score']}"
        )

        return parsed_data

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))