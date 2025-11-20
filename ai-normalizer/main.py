from fastapi import FastAPI, Request
import uvicorn
import re
import hashlib

app = FastAPI(title="AI Message Normalizer Service")


# ----------------------
# Utility Helpers
# ----------------------

def hash_id(raw_id: str) -> str:
    """Hash user ID for privacy."""
    return hashlib.sha256(raw_id.encode()).hexdigest()[:16]


def mask_pii(text: str) -> str:
    """Mask URLs, emails, phone numbers, order IDs."""
    text = text.strip()

    # URLs
    text = re.sub(r'https?://\S+', '<URL>', text)

    # Emails
    text = re.sub(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.\w+', '<EMAIL>', text)

    # Phone numbers (naive but effective)
    text = re.sub(r'\+?\d[\d\s-]{7,}\d', '<PHONE>', text)

    # Order IDs ("order 1234", "ord123", etc.)
    text = re.sub(r'\b(order|ord)[\s:#-]*[A-Za-z0-9-]+\b', '<ORDER_ID>', text, flags=re.I)

    return text


# ----------------------
# Normalizers
# ----------------------

def normalize_facebook(raw):
    """Normalize raw Facebook Messenger webhook payload."""

    try:
        entry = raw["entry"][0]
        msg = entry["messaging"][0]
    except (KeyError, IndexError):
        return {"error": "Invalid Facebook payload structure."}

    sender = msg["sender"]["id"]
    text = msg["message"].get("text", "")

    normalized = {
        "message_id": msg["message"].get("mid"),
        "platform": "facebook",
        "channel_type": "dm",
        "conversation_id": entry.get("id"),
        "user_id_hashed": hash_id(sender),
        "original_text": text,
        "clean_text": mask_pii(text),
        "language": "en",  # You can plug in language detection later
        "timestamp_utc": msg.get("timestamp"),
        "metadata": {
            "sender_id": sender,
            "recipient_id": msg["recipient"]["id"],
        }
    }

    return normalized


def normalize_instagram(raw):
    """Placeholder until you provide IG webhook payload."""
    return {
        "error": "Instagram normalizer not implemented yet. Send IG webhook payload."
    }


# ----------------------
# API Routes
# ----------------------

@app.post("/normalize/facebook")
async def normalize_facebook_api(request: Request):
    raw = await request.json()
    return normalize_facebook(raw)


@app.post("/normalize/instagram")
async def normalize_instagram_api(request: Request):
    raw = await request.json()
    return normalize_instagram(raw)


@app.get("/")
def root():
    return {"status": "Normalizer service running"}


# ----------------------
# Local Development Runner
# ----------------------

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
