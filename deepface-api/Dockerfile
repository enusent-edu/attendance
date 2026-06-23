FROM python:3.10-slim

WORKDIR /app

# System deps for OpenCV + dlib
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download ArcFace + RetinaFace models at build time
RUN python -c "from deepface import DeepFace; DeepFace.build_model('ArcFace')" || true

COPY app.py .

EXPOSE 5001
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "--timeout", "120", "app:app"]
