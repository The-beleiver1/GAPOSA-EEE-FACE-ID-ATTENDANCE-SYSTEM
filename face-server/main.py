import os
import io
import base64
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from deepface import DeepFace
from PIL import Image

app = FastAPI(title="GAPOSA Face Recognition Server", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME = "ArcFace"
DETECTOR   = "yunet"

# ── Request models ────────────────────────────────────────────────
class EmbedRequest(BaseModel):
    image: str

class BatchEmbedRequest(BaseModel):
    images: list[str]

class StoredEmbedding(BaseModel):
    matric: str
    name:   Optional[str] = ''
    embedding: list[float]

class DeduplicateRequest(BaseModel):
    new_image:         str                   # base64 of new face
    stored_embeddings: list[StoredEmbedding] # all enrolled faces

class EmbedResponse(BaseModel):
    embedding: list[float]
    success:   bool
    message:   str

class BatchEmbedResponse(BaseModel):
    embeddings: list[list[float]]
    count:      int
    success:    bool
    message:    str

class DeduplicateResponse(BaseModel):
    is_duplicate:    bool
    matched_matric:  Optional[str]        = None
    matched_name:    Optional[str]        = None
    similarity:      Optional[float]      = None
    embedding:       Optional[list[float]]= None
    message:         str

# ── Helpers ───────────────────────────────────────────────────────
def decode_image(b64: str) -> np.ndarray:
    if "," in b64:
        b64 = b64.split(",")[1]
    img_bytes = base64.b64decode(b64)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(img)

def get_embedding(img_array: np.ndarray) -> list[float]:
    result = DeepFace.represent(
        img_path          = img_array,
        model_name        = MODEL_NAME,
        detector_backend  = DETECTOR,
        enforce_detection = True,
        align             = True,
    )
    if not result:
        raise ValueError("No face detected")
    return result[0]["embedding"]

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors. Returns 0-1, higher = more similar."""
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))

# ── Health ────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status":   "running",
        "model":    MODEL_NAME,
        "detector": DETECTOR,
        "version":  "4.0.0",
        "message":  "GAPOSA Face Recognition Server"
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

# ── Single embedding ──────────────────────────────────────────────
@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    try:
        img = decode_image(request.image)
        emb = get_embedding(img)
        return EmbedResponse(embedding=emb, success=True, message="Embedding generated")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── Batch embeddings ──────────────────────────────────────────────
@app.post("/embed/batch", response_model=BatchEmbedResponse)
async def embed_batch(request: BatchEmbedRequest):
    embeddings = []
    errors     = []

    for i, img_b64 in enumerate(request.images):
        try:
            img = decode_image(img_b64)
            emb = get_embedding(img)
            embeddings.append(emb)
        except Exception as e:
            errors.append(f"Frame {i+1}: {str(e)}")

    if len(embeddings) == 0:
        raise HTTPException(
            status_code = 400,
            detail = "Face not detected clearly. Ensure face is well-lit and fully visible."
        )

    return BatchEmbedResponse(
        embeddings = embeddings,
        count      = len(embeddings),
        success    = True,
        message    = f"Generated {len(embeddings)} embeddings"
    )

# ── Deduplicate — THE KEY ENDPOINT ───────────────────────────────
# Compares new face against ALL stored embeddings using numpy cosine similarity
# This bypasses pgvector entirely — comparison done in Python
# Same face = cosine similarity > 0.50 (empirically tested with ArcFace + yunet)
@app.post("/deduplicate", response_model=DeduplicateResponse)
async def deduplicate(request: DeduplicateRequest):
    print(f"[/deduplicate] called — stored_embeddings count: {len(request.stored_embeddings)}, new_image length: {len(request.new_image)}")

    # Step 1 — Generate embedding for new face
    try:
        img = decode_image(request.new_image)
        new_embedding = get_embedding(img)
    except Exception as e:
        raise HTTPException(
            status_code = 400,
            detail = f"Could not process new face image: {str(e)}"
        )

    # Step 2 — No stored embeddings? Cannot be a duplicate
    if not request.stored_embeddings:
        return DeduplicateResponse(
            is_duplicate = False,
            message      = "No enrolled students to compare against"
        )

    # Step 3 — Compare against every stored embedding
    best_match     = None
    best_similarity = 0.0

    for stored in request.stored_embeddings:
        try:
            similarity = cosine_similarity(new_embedding, stored.embedding)
            print(f"Comparing with {stored.matric}: similarity = {similarity:.4f}")

            if similarity > best_similarity:
                best_similarity = similarity
                best_match      = stored
        except Exception as e:
            print(f"Error comparing with {stored.matric}: {e}")
            continue

    print(f"Best match: {best_match.matric if best_match else 'none'} | similarity: {best_similarity:.4f}")

    # Step 4 — Threshold: similarity > 0.50 = same person
    # ArcFace cosine similarity: same person typically 0.60-0.99
    # Different people typically 0.10-0.45
    DUPLICATE_THRESHOLD = 0.50

    if best_match and best_similarity >= DUPLICATE_THRESHOLD:
        return DeduplicateResponse(
            is_duplicate   = True,
            matched_matric = best_match.matric,
            matched_name   = best_match.name,
            similarity     = round(best_similarity, 4),
            embedding      = new_embedding,
            message        = f"Face matches existing enrollment: {best_match.name} ({best_match.matric})"
        )

    return DeduplicateResponse(
        is_duplicate = False,
        similarity   = round(best_similarity, 4),
        embedding    = new_embedding,
        message      = f"No duplicate found. Best similarity was {best_similarity:.4f}"
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)