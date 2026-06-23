import os, json, base64, tempfile
from flask import Flask, request, jsonify
from deepface import DeepFace
import numpy as np

app = Flask(__name__)

MODEL_NAME = "ArcFace"
DETECTOR = "retinaface"
DISTANCE_METRIC = "cosine"
THRESHOLD = 0.40  # stricter than default 0.68 for Asian faces

def decode_image(b64_string):
    """Decode base64 image to temp file, return path."""
    data = base64.b64decode(b64_string.split(",")[-1])
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    tmp.write(data)
    tmp.close()
    return tmp.name

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME})

@app.route("/enroll", methods=["POST"])
def enroll():
    """
    Enroll a face: return ArcFace embedding.
    Body: { "image": "base64..." }
    Returns: { "encoding": [...512 floats...] }
    """
    try:
        body = request.get_json()
        img_path = decode_image(body["image"])
        embedding_obj = DeepFace.represent(
            img_path=img_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR,
            enforce_detection=True
        )
        os.unlink(img_path)
        return jsonify({"encoding": embedding_obj[0]["embedding"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/verify", methods=["POST"])
def verify():
    """
    Verify face against stored encoding.
    Body: { "image": "base64...", "encoding": [...512 floats...] }
    Returns: { "verified": bool, "distance": float }
    """
    try:
        body = request.get_json()
        img_path = decode_image(body["image"])
        stored_encoding = body["encoding"]

        # Get embedding of captured image
        embedding_obj = DeepFace.represent(
            img_path=img_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR,
            enforce_detection=True
        )
        os.unlink(img_path)

        captured = np.array(embedding_obj[0]["embedding"])
        stored = np.array(stored_encoding)

        # Cosine distance
        dot = np.dot(captured, stored)
        norm = np.linalg.norm(captured) * np.linalg.norm(stored)
        distance = 1 - (dot / norm) if norm > 0 else 1.0

        verified = distance <= THRESHOLD
        return jsonify({
            "verified": verified,
            "distance": round(float(distance), 4),
            "threshold": THRESHOLD
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/identify", methods=["POST"])
def identify():
    """
    Identify face against a list of stored encodings.
    Body: { "image": "base64...", "candidates": [{"id":"...","encoding":[...]}] }
    Returns: { "matched_id": "...", "distance": float } or { "matched_id": null }
    """
    try:
        body = request.get_json()
        img_path = decode_image(body["image"])
        candidates = body["candidates"]  # [{ id, encoding }]

        embedding_obj = DeepFace.represent(
            img_path=img_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR,
            enforce_detection=True
        )
        os.unlink(img_path)

        captured = np.array(embedding_obj[0]["embedding"])

        best_id = None
        best_dist = float("inf")

        for c in candidates:
            stored = np.array(c["encoding"])
            dot = np.dot(captured, stored)
            norm = np.linalg.norm(captured) * np.linalg.norm(stored)
            dist = 1 - (dot / norm) if norm > 0 else 1.0
            if dist < best_dist:
                best_dist = dist
                best_id = c["id"]

        if best_dist <= THRESHOLD:
            return jsonify({"matched_id": best_id, "distance": round(best_dist, 4)})
        else:
            return jsonify({"matched_id": None, "distance": round(best_dist, 4)})

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
