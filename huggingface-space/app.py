from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import json
import os
import threading
import time
from urllib.request import Request, urlopen
from urllib.error import URLError

app = FastAPI()

MODEL_ID = os.environ.get("MODEL_ID", "saksham0510/formai-tinyllama")
print(f"Loading model: {MODEL_ID}")

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    device_map="cpu",
    trust_remote_code=True,
    low_cpu_mem_usage=True,
)
model.eval()
print("Model loaded!")

SYSTEM_PROMPT = (
    "You are FormAI. When given a topic you return ONLY a valid JSON object "
    "with title, description, and questions array. "
    "No explanation. No markdown. Just JSON."
)

FALLBACK = {
    "title": "Custom Form",
    "description": "Please fill out this form",
    "questions": [
        {"questionText": "Please provide your response", "questionType": "long_answer",
         "options": None, "isRequired": True, "orderIndex": 0, "questionId": "q1"}
    ]
}


# --------------------------------------------------------------------------- #
# Keep-alive: stop the free Space from sleeping when there is no user traffic.
#
# Free HF CPU Spaces go idle after ~48h without requests, then pay a slow cold
# start. This background thread pings the Space's OWN PUBLIC URL every few
# minutes. HF only counts requests that hit the public *.hf.space host as
# activity — a localhost request would NOT reset the idle timer, so we must use
# the public host. HF injects SPACE_HOST into every running Space, so the URL is
# discovered automatically (and stays off during local dev where it's absent).
# --------------------------------------------------------------------------- #
KEEP_ALIVE_INTERVAL_SECONDS = 300


def _resolve_self_url(path: str = "/health"):
    host = os.environ.get("SPACE_HOST")
    if not host:
        author = os.environ.get("SPACE_AUTHOR_NAME")
        repo = os.environ.get("SPACE_REPO_NAME")
        if author and repo:
            host = f"{author}-{repo}.hf.space"
    if not host:
        return None
    if not path.startswith("/"):
        path = "/" + path
    return f"https://{host}{path}"


def _keep_alive_loop(url: str, interval: int):
    while True:
        time.sleep(interval)
        try:
            req = Request(url, headers={"User-Agent": "keep-alive-self-ping"})
            with urlopen(req, timeout=30) as resp:
                resp.read(1)
        except URLError:
            pass
        except Exception:
            pass


@app.on_event("startup")
def start_keep_alive():
    url = _resolve_self_url("/health")
    if not url:
        print("[keep_alive] SPACE_HOST not set — self-ping disabled (local dev).")
        return
    threading.Thread(
        target=_keep_alive_loop,
        args=(url, KEEP_ALIVE_INTERVAL_SECONDS),
        name="hf-keep-alive",
        daemon=True,
    ).start()
    print(f"[keep_alive] self-ping started: {url} every {KEEP_ALIVE_INTERVAL_SECONDS}s")


def extract_json(text):
    start = text.find("{")
    if start == -1:
        return None
    try:
        decoder = json.JSONDecoder()
        parsed, _ = decoder.raw_decode(text[start:])
        return parsed
    except json.JSONDecodeError:
        return None

class GenerateRequest(BaseModel):
    prompt: str
    questionCount: int = 5

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/generate")
def generate(req: GenerateRequest):
    full_prompt = (
        f"<|system|>\n{SYSTEM_PROMPT}</s>\n"
        f"<|user|>\nGenerate a form about: {req.prompt}</s>\n"
        f"<|assistant|>\n"
    )
    inputs = tokenizer(full_prompt, return_tensors="pt")
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=1024,
            temperature=0.3,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )
    response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()

    parsed = extract_json(response)
    if parsed and "title" in parsed and "questions" in parsed:
        for i, q in enumerate(parsed["questions"]):
            if "questionId" not in q:
                q["questionId"] = f"q{i+1}"
            if "orderIndex" not in q:
                q["orderIndex"] = i
        return parsed

    return FALLBACK
