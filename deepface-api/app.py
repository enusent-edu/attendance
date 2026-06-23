import os, json, base64, tempfile, concurrent.futures
from flask import Flask, request, jsonify
from deepface import DeepFace
import numpy as np
import cv2

app = Flask(__name__)

MODEL_NAME     = "ArcFace"
DETECTOR       = "retinaface"
YOLO_DETECTOR  = "yolov8"
DISTANCE_METRIC = "cosine"
THRESHOLD      = 0.40

def decode_image(b64_string):
    data = base64.b64decode(b64_string.split(",")[-1])
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    tmp.write(data); tmp.close()
    return tmp.name

def cosine_dist(a, b):
    a, b = np.array(a), np.array(b)
    dot = np.dot(a, b)
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    return 1 - (dot / norm) if norm > 0 else 1.0

def match_encoding(captured, candidates):
    best_id, best_dist = None, float("inf")
    for c in candidates:
        dist = cosine_dist(captured, c["encoding"])
        if dist < best_dist:
            best_dist = dist
            best_id = c["id"]
    if best_dist <= THRESHOLD:
        return {"matched_id": best_id, "distance": round(best_dist, 4)}
    return {"matched_id": None, "distance": round(best_dist, 4)}

@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME})

@app.route("/enroll", methods=["POST"])
def enroll():
    try:
        body = request.get_json()
        img_path = decode_image(body["image"])
        emb = DeepFace.represent(img_path=img_path, model_name=MODEL_NAME,
                                  detector_backend=DETECTOR, enforce_detection=True)
        os.unlink(img_path)
        return jsonify({"encoding": emb[0]["embedding"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/identify", methods=["POST"])
def identify():
    """Single face identify — manual mode."""
    try:
        body = request.get_json()
        img_path = decode_image(body["image"])
        emb = DeepFace.represent(img_path=img_path, model_name=MODEL_NAME,
                                  detector_backend=DETECTOR, enforce_detection=True)
        os.unlink(img_path)
        result = match_encoding(emb[0]["embedding"], body["candidates"])
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/identify-multi", methods=["POST"])
def identify_multi():
    """
    Multi-face identify — real-time mode.
    Uses YOLOv8-face to detect ALL faces in frame,
    then ArcFace identifies each in parallel.
    Body: { "image": "base64...", "candidates": [{id, encoding}] }
    Returns: { "results": [{matched_id, distance, face_index}] }
    """
    try:
        body = request.get_json()
        img_path = decode_image(body["image"])
        candidates = body["candidates"]

        # Detect all faces + get embeddings via YOLOv8
        all_embeddings = DeepFace.represent(
            img_path=img_path,
            model_name=MODEL_NAME,
            detector_backend=YOLO_DETECTOR,
            enforce_detection=False  # don't fail if no face
        )
        os.unlink(img_path)

        if not all_embeddings:
            return jsonify({"results": []})

        # Parallel identify each detected face
        def identify_face(idx_emb):
            idx, emb_obj = idx_emb
            result = match_encoding(emb_obj["embedding"], candidates)
            result["face_index"] = idx
            result["facial_area"] = emb_obj.get("facial_area", {})
            return result

        with concurrent.futures.ThreadPoolExecutor() as executor:
            results = list(executor.map(identify_face, enumerate(all_embeddings)))

        # Filter out unmatched, deduplicate (same person detected twice)
        matched = [r for r in results if r["matched_id"]]
        seen_ids = set()
        unique = []
        for r in sorted(matched, key=lambda x: x["distance"]):
            if r["matched_id"] not in seen_ids:
                seen_ids.add(r["matched_id"])
                unique.append(r)

        return jsonify({"results": unique, "faces_detected": len(all_embeddings)})

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
