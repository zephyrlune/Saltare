from __future__ import annotations

import json
import uuid
from pathlib import Path
from threading import Lock

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "output"
MODEL_PATH = ROOT / "models" / "pose_landmarker_full.task"
MIN_VISIBILITY = 0.5
JOINT_INDICES = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32]

app = FastAPI(title="Saltare Pose API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: dict[str, "DanceSession"] = {}
sessions_lock = Lock()


def dance_files() -> list[Path]:
    return sorted(OUTPUT_DIR.glob("*_pose.npz"))


def dance_id(path: Path) -> str:
    return path.stem.removesuffix("_pose")


def load_reference(reference_path: Path) -> tuple[np.ndarray, float, str]:
    with np.load(reference_path, allow_pickle=False) as data:
        poses = data["keypoints_normalized"].astype(np.float32)
        fps = float(data["fps"]) if "fps" in data else 30.0
        joint_names = data["joint_names"].tolist() if "joint_names" in data else []
    return poses, fps, json.dumps(joint_names)


def normalize_pose(pose: np.ndarray) -> np.ndarray:
    normalized = pose.copy()
    hip_indices = (7, 8)
    shoulder_indices = (1, 2)
    hip_points = normalized[list(hip_indices), :2]
    shoulder_points = normalized[list(shoulder_indices), :2]
    valid_hips = np.isfinite(hip_points).all(axis=1)
    valid_shoulders = np.isfinite(shoulder_points).all(axis=1)

    if valid_hips.any():
        normalized[:, :2] -= np.nanmean(hip_points[valid_hips], axis=0)
    if valid_hips.any() and valid_shoulders.any():
        torso = np.nanmean(shoulder_points[valid_shoulders], axis=0) - np.nanmean(hip_points[valid_hips], axis=0)
        scale = float(np.linalg.norm(torso))
        if scale > 1e-6:
            normalized[:, :2] /= scale
    return normalized


def pose_score(user_pose: np.ndarray, reference_pose: np.ndarray) -> tuple[float, int]:
    user = normalize_pose(user_pose)
    reference = normalize_pose(reference_pose)
    valid = (
        np.isfinite(user[:, :2]).all(axis=1)
        & np.isfinite(reference[:, :2]).all(axis=1)
        & (user[:, 2] >= MIN_VISIBILITY)
        & (reference[:, 2] >= MIN_VISIBILITY)
    )
    count = int(valid.sum())
    if count == 0:
        return 0.0, 0
    distance = np.linalg.norm(user[valid, :2] - reference[valid, :2], axis=1).mean()
    return float(np.clip(100.0 * (1.0 - distance / 2.0), 0.0, 100.0)), count


class DanceSession:
    def __init__(self, reference_path: Path):
        self.poses, self.fps, self.joint_names = load_reference(reference_path)
        self.scores: list[float] = []
        self.round_scores: list[list[float]] = [[], [], []]
        self.frame_count = 0
        self.landmarker = vision.PoseLandmarker.create_from_options(
            vision.PoseLandmarkerOptions(
                base_options=python.BaseOptions(model_asset_path=str(MODEL_PATH)),
                running_mode=vision.RunningMode.IMAGE,
                num_poses=1,
                min_pose_detection_confidence=0.5,
                min_pose_presence_confidence=0.5,
                min_tracking_confidence=0.5,
            )
        )

    def close(self) -> None:
        self.landmarker.close()

    def extract_pose(self, image_bytes: bytes) -> np.ndarray:
        image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image frame")
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        result = self.landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(image_rgb)))
        pose = np.full((15, 3), np.nan, dtype=np.float32)
        if result.pose_landmarks:
            landmarks = result.pose_landmarks[0]
            for output_index, landmark_index in enumerate(JOINT_INDICES):
                landmark = landmarks[landmark_index]
                if landmark.visibility is not None and landmark.visibility >= MIN_VISIBILITY:
                    pose[output_index] = [landmark.x, landmark.y, landmark.visibility]
        return pose


class StartSessionRequest(BaseModel):
    dance_id: str


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dances")
def dances() -> list[dict[str, object]]:
    result = []
    for path in dance_files():
        metadata_path = OUTPUT_DIR / f"{path.stem}_metadata.json"
        metadata = json.loads(metadata_path.read_text(encoding="utf-8")) if metadata_path.exists() else {}
        result.append({"id": dance_id(path), "label": metadata.get("source_video", dance_id(path)), "frames": metadata.get("num_frames")})
    return result


@app.post("/api/sessions")
def start_session(request: StartSessionRequest) -> dict[str, object]:
    reference_path = next((path for path in dance_files() if dance_id(path) == request.dance_id), None)
    if reference_path is None:
        raise HTTPException(status_code=404, detail=f"Unknown dance: {request.dance_id}")
    session_id = uuid.uuid4().hex
    with sessions_lock:
        sessions[session_id] = DanceSession(reference_path)
    session = sessions[session_id]
    return {"session_id": session_id, "reference_id": request.dance_id, "fps": session.fps, "frames": len(session.poses)}


@app.post("/api/sessions/{session_id}/frames")
def score_frame(session_id: str, frame: UploadFile = File(...), round_number: int = Form(1)) -> dict[str, object]:
    session = sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Unknown or expired session")
    pose = session.extract_pose(frame.file.read())
    reference_index = session.frame_count % len(session.poses)
    round_index = min(max(round_number - 1, 0), 2)
    score, visible_joints = pose_score(pose, session.poses[reference_index])
    session.frame_count += 1
    if visible_joints:
        session.scores.append(score)
        session.round_scores[round_index].append(score)
    average = float(np.mean(session.scores)) if session.scores else 0.0
    return {"score": round(score), "average_score": round(average), "frame_index": reference_index, "round": round_index + 1, "visible_joints": visible_joints, "detected": bool(visible_joints)}


@app.post("/api/sessions/{session_id}/finish")
def finish_session(session_id: str) -> dict[str, object]:
    with sessions_lock:
        session = sessions.pop(session_id, None)
    if session is None:
        raise HTTPException(status_code=404, detail="Unknown or expired session")
    average = float(np.mean(session.scores)) if session.scores else 0.0
    round_scores = [round(float(np.mean(scores))) if scores else 0 for scores in session.round_scores]
    session.close()
    return {"score": round(average), "round_scores": round_scores, "frames_scored": len(session.scores)}
