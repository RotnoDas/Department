"""
Face verification microservice for Department attendance.

Pipeline (all OpenCV, no compiled extras required on Windows):
  * YuNet  -> face detection + 5 landmarks (eyes, nose, mouth corners)
  * SFace  -> 128-d identity embedding (cosine similarity)
  * LBF    -> 68 landmarks, used only for the blink (eye-aspect-ratio) check

Liveness is an *active challenge* issued by the Node server in random order:
  center -> look straight (identity reference frame)
  left   -> turn head to the student's left
  right  -> turn head to the student's right
  blink  -> burst of frames while the student blinks

A printed photo or a flat screen cannot change the nose/eye ratio when tilted,
so the head-turn steps defeat simple photo attacks; the blink step defeats
static images held in front of the camera.

This service is stateless. It never stores faces. Node sends the frames (and,
for verification, the student's enrolled reference embedding) and decides what
to do with the result.
"""

from __future__ import annotations

import base64
import os
import threading
from pathlib import Path
from typing import List, Literal, Optional

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

MODELS_DIR = BASE_DIR / "models"
YUNET_PATH = MODELS_DIR / "face_detection_yunet_2023mar.onnx"
SFACE_PATH = MODELS_DIR / "face_recognition_sface_2021dec.onnx"
LBF_PATH = MODELS_DIR / "lbfmodel.yaml"

INTERNAL_SECRET = os.getenv("FACE_SERVICE_SECRET", "")

# SFace cosine similarity. OpenCV's published threshold is 0.363; we are a bit stricter.
MATCH_THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.42"))
# Every challenge frame must still look like the same person (turned faces score lower).
CONSISTENCY_THRESHOLD = float(os.getenv("FACE_CONSISTENCY_THRESHOLD", "0.30"))
MIN_FACE_PX = int(os.getenv("FACE_MIN_SIZE_PX", "90"))
DETECT_SCORE = float(os.getenv("FACE_DETECT_SCORE", "0.80"))

# Yaw ratio = (nose_x - rightEye_x) / (leftEye_x - rightEye_x) on the *unmirrored* camera frame.
# ~0.5 when looking straight. Turning to the student's left pushes the nose to image-right (> 0.5).
FRONTAL_MIN = float(os.getenv("FACE_FRONTAL_MIN", "0.36"))
FRONTAL_MAX = float(os.getenv("FACE_FRONTAL_MAX", "0.64"))
TURN_LEFT_MIN = float(os.getenv("FACE_TURN_LEFT_MIN", "0.66"))
TURN_RIGHT_MAX = float(os.getenv("FACE_TURN_RIGHT_MAX", "0.34"))

REQUIRE_BLINK = os.getenv("FACE_REQUIRE_BLINK", "true").lower() == "true"
# Blink passes when the eye-aspect-ratio drops by at least this fraction from the open-eye level.
BLINK_MIN_DROP = float(os.getenv("FACE_BLINK_MIN_DROP", "0.22"))
BLINK_MIN_FRAMES = int(os.getenv("FACE_BLINK_MIN_FRAMES", "5"))

MAX_FRAME_BYTES = 1_500_000
MAX_FRAMES = 24
MAX_WIDTH = 640

Step = Literal["center", "left", "right", "blink"]

# ── Models (OpenCV DNN objects are not thread-safe → serialize access) ──────────
_lock = threading.Lock()
detector = cv2.FaceDetectorYN.create(str(YUNET_PATH), "", (320, 320), DETECT_SCORE, 0.3, 50)
recognizer = cv2.FaceRecognizerSF.create(str(SFACE_PATH), "")
facemark = cv2.face.createFacemarkLBF()
facemark.loadModel(str(LBF_PATH))

app = FastAPI(title="Department Face Verification Service", version="1.0.0")


@app.middleware("http")
async def require_internal_secret(request: Request, call_next):
    # Only the Node server may call /analyze. Checked before body parsing.
    if request.url.path != "/health" and INTERNAL_SECRET:
        if request.headers.get("x-internal-secret") != INTERNAL_SECRET:
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


class Frame(BaseModel):
    step: Step
    image: str = Field(..., description="Base64 JPEG/PNG, optionally a data: URL")


class AnalyzeRequest(BaseModel):
    steps: List[Step] = Field(..., min_length=1, max_length=8)
    frames: List[Frame] = Field(..., min_length=1, max_length=MAX_FRAMES)
    reference: Optional[List[float]] = Field(default=None, description="Enrolled 128-d embedding")


class LivenessFailure(Exception):
    def __init__(self, code: str, message: str, step: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.step = step


# ── Helpers ────────────────────────────────────────────────────────────────────
def decode_image(data: str) -> np.ndarray:
    if "," in data and data.strip().startswith("data:"):
        data = data.split(",", 1)[1]
    try:
        raw = base64.b64decode(data, validate=False)
    except Exception as exc:  # noqa: BLE001
        raise LivenessFailure("BAD_IMAGE", "A camera frame could not be decoded.") from exc
    if len(raw) > MAX_FRAME_BYTES:
        raise LivenessFailure("BAD_IMAGE", "A camera frame is too large.")
    img = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise LivenessFailure("BAD_IMAGE", "A camera frame could not be decoded.")
    h, w = img.shape[:2]
    if w > MAX_WIDTH:
        scale = MAX_WIDTH / w
        img = cv2.resize(img, (MAX_WIDTH, int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def detect_faces(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    detector.setInputSize((w, h))
    _, faces = detector.detect(img)
    if faces is None:
        return np.empty((0, 15), dtype=np.float32)
    return faces


def primary_face(img: np.ndarray, step: str, strict_single: bool) -> np.ndarray:
    faces = detect_faces(img)
    if len(faces) == 0:
        raise LivenessFailure("NO_FACE", "No face detected. Keep your face inside the oval with good lighting.", step)
    if strict_single and len(faces) > 1:
        raise LivenessFailure("MULTIPLE_FACES", "More than one face detected. Only you should be in the frame.", step)
    # Largest face
    face = max(faces, key=lambda f: f[2] * f[3])
    if min(face[2], face[3]) < MIN_FACE_PX:
        raise LivenessFailure("FACE_TOO_SMALL", "Your face is too far away. Move closer to the camera.", step)
    return face


def yaw_ratio(face: np.ndarray) -> float:
    re_x, le_x, nose_x = face[4], face[6], face[8]
    span = le_x - re_x
    if abs(span) < 1e-3:
        return 0.5
    return float((nose_x - re_x) / span)


def embedding(img: np.ndarray, face: np.ndarray) -> np.ndarray:
    aligned = recognizer.alignCrop(img, face)
    feat = recognizer.feature(aligned).flatten().astype(np.float32)
    norm = np.linalg.norm(feat)
    return feat / norm if norm > 0 else feat


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / ((np.linalg.norm(a) * np.linalg.norm(b)) + 1e-9))


def eye_aspect_ratio(img: np.ndarray, face: np.ndarray) -> Optional[float]:
    x, y, w, h = [int(v) for v in face[:4]]
    rects = np.array([[max(0, x), max(0, y), w, h]], dtype=np.int32)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ok, landmarks = facemark.fit(gray, rects)
    if not ok or len(landmarks) == 0:
        return None
    # OpenCV 4.x returns (1, 68, 2) per face while 5.x returns (68, 1, 2): normalise to (68, 2).
    pts = np.asarray(landmarks[0], dtype=np.float32).reshape(-1, 2)
    if pts.shape[0] < 48:
        return None

    def ear(e: np.ndarray) -> float:
        a = np.linalg.norm(e[1] - e[5])
        b = np.linalg.norm(e[2] - e[4])
        c = np.linalg.norm(e[0] - e[3])
        return float((a + b) / (2.0 * c)) if c > 0 else 0.0

    return (ear(pts[36:42]) + ear(pts[42:48])) / 2.0


# ── Core analysis ──────────────────────────────────────────────────────────────
def analyze(req: AnalyzeRequest) -> dict:
    expected = set(req.steps)
    by_step: dict[str, list[np.ndarray]] = {s: [] for s in expected}
    for fr in req.frames:
        if fr.step not in expected:
            raise LivenessFailure("UNEXPECTED_STEP", f"Frame for unexpected step '{fr.step}'.", fr.step)
        by_step[fr.step].append(decode_image(fr.image))

    if "center" not in by_step or not by_step["center"]:
        raise LivenessFailure("MISSING_STEP", "Missing the 'look straight' frame.", "center")
    for s in expected:
        if not by_step[s]:
            raise LivenessFailure("MISSING_STEP", f"Missing frames for step '{s}'.", s)

    metrics: dict = {}

    # 1. Center frames → identity anchor, must be frontal and single-person.
    center_embs = []
    center_ratios = []
    for img in by_step["center"]:
        face = primary_face(img, "center", strict_single=True)
        r = yaw_ratio(face)
        center_ratios.append(round(r, 3))
        if not (FRONTAL_MIN <= r <= FRONTAL_MAX):
            raise LivenessFailure("NOT_FRONTAL", "Please look straight at the camera for the first photo.", "center")
        center_embs.append(embedding(img, face))
    anchor = np.mean(center_embs, axis=0)
    anchor /= np.linalg.norm(anchor) + 1e-9
    metrics["center"] = {"yaw": center_ratios}

    def check_same_person(img: np.ndarray, face: np.ndarray, step: str) -> float:
        sim = cosine(anchor, embedding(img, face))
        if sim < CONSISTENCY_THRESHOLD:
            raise LivenessFailure("IDENTITY_SWITCH", "The face changed during the check. Please try again alone.", step)
        return sim

    # 2. Head turns.
    # Frames captured mid-turn can lose the face, so frames with no usable face are skipped
    # instead of failing the whole attempt. Every frame that *is* usable must still be the same
    # person as the frontal anchor and the only person in view.
    for step in ("left", "right"):
        if step not in expected:
            continue
        best_ratio, best_sim = None, None
        passed = False
        usable = 0
        for img in by_step[step]:
            try:
                face = primary_face(img, step, strict_single=True)
            except LivenessFailure as lf:
                if lf.code == "MULTIPLE_FACES":
                    raise
                continue
            usable += 1
            r = yaw_ratio(face)
            sim = check_same_person(img, face, step)
            if best_ratio is None or (r > best_ratio if step == "left" else r < best_ratio):
                best_ratio, best_sim = r, sim
            if (step == "left" and r >= TURN_LEFT_MIN) or (step == "right" and r <= TURN_RIGHT_MAX):
                passed = True
        metrics[step] = {
            "yaw": round(best_ratio if best_ratio is not None else 0, 3),
            "similarity": round(best_sim if best_sim is not None else 0, 3),
            "usableFrames": usable,
        }
        if usable == 0:
            raise LivenessFailure("NO_FACE", "No face detected while turning. Keep your face in the frame and turn slowly.", step)
        if not passed:
            direction = "LEFT" if step == "left" else "RIGHT"
            raise LivenessFailure("TURN_NOT_DETECTED", f"Head turn to your {direction} was not detected. Turn a little more.", step)

    # 3. Blink.
    if "blink" in expected:
        ears = []
        for img in by_step["blink"]:
            try:
                face = primary_face(img, "blink", strict_single=True)
            except LivenessFailure as lf:
                if lf.code in ("MULTIPLE_FACES",):
                    raise
                continue  # a closed-eye frame can occasionally miss detection
            check_same_person(img, face, "blink")
            e = eye_aspect_ratio(img, face)
            if e is not None:
                ears.append(e)
        metrics["blink"] = {"frames": len(ears)}
        if len(ears) < BLINK_MIN_FRAMES:
            raise LivenessFailure("BLINK_NOT_DETECTED", "Could not see your eyes clearly. Improve lighting and try again.", "blink")
        open_level = float(np.mean(sorted(ears)[-3:]))
        closed_level = float(min(ears))
        drop = (open_level - closed_level) / open_level if open_level > 0 else 0.0
        metrics["blink"].update({"open": round(open_level, 3), "closed": round(closed_level, 3), "drop": round(drop, 3)})
        if REQUIRE_BLINK and drop < BLINK_MIN_DROP:
            raise LivenessFailure("BLINK_NOT_DETECTED", "Blink was not detected. Blink slowly when asked.", "blink")

    result = {
        "ok": True,
        "liveness": True,
        "embedding": [float(v) for v in anchor],
        "matchThreshold": MATCH_THRESHOLD,
        "metrics": metrics,
    }

    # 4. Identity against enrolled reference (verification mode).
    if req.reference is not None:
        ref = np.asarray(req.reference, dtype=np.float32)
        if ref.shape != anchor.shape:
            raise LivenessFailure("BAD_REFERENCE", "Enrolled face data is invalid. Ask an admin to reset it.")
        sim = cosine(anchor, ref)
        result["similarity"] = round(sim, 4)
        result["match"] = sim >= MATCH_THRESHOLD
        if not result["match"]:
            result["ok"] = False
            result["code"] = "FACE_MISMATCH"
            result["reason"] = "Face does not match the registered student."

    return result


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"ok": True, "matchThreshold": MATCH_THRESHOLD, "requireBlink": REQUIRE_BLINK}


@app.post("/analyze")
def analyze_route(req: AnalyzeRequest):
    try:
        with _lock:
            return analyze(req)
    except LivenessFailure as lf:
        return {"ok": False, "liveness": False, "code": lf.code, "reason": lf.message, "step": lf.step}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host=os.getenv("FACE_SERVICE_HOST", "127.0.0.1"), port=int(os.getenv("FACE_SERVICE_PORT", "8001")))
