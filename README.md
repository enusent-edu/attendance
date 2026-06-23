# AttendTrack — Offline Face + QR Attendance System
> Local-first attendance system with AI face recognition, liveness detection, and QR scanning.

**Local Access:** https://192.168.88.232:4430  
**Demo:** https://attendance.powerlife-shop.com  
**Stack:** Next.js 14 · DeepFace (ArcFace) · PostgreSQL · Docker · nginx SSL  
**Repo:** https://github.com/enusent-edu/attendance  

## Default Login
- Email: `admin@attendance.demo`
- Password: `admin123`

## Ports
- `3017` — attendance-app (Next.js)
- `5002` — attendance-deepface (Flask/ArcFace)
- `4430` — HTTPS via nginx (self-signed, camera-enabled)

## Architecture
```
Browser (HTTPS:4430)
  └── nginx (self-signed SSL) → attendance-app:3000
        ├── PostgreSQL (local, attendance schema)
        └── DeepFace API:5001 (ArcFace + RetinaFace, Quadro P1000 GPU)
```

## Features
- Dashboard with live stats
- Members — add, enroll face, QR code
- Groups — assign members, set attendance method
- Attendance — Face (real-time + manual) + QR scanner
- Blink detection (liveness anti-spoof)
- Real-time auto-detection mode (no button press)

## Attendance Methods
| Method | Description |
|---|---|
| Face Only | ArcFace recognition + blink liveness |
| QR Only | html5-qrcode scan |
| Face + QR | Both allowed |
| Manual | Admin logs manually |

## Workflow
1. **Members** → Add Member → Enroll Face
2. **Groups** → Add Group → Manage Members → assign enrolled members
3. **Attendance** → Select Group → Start Real-time Detection → blink to log

## Deploy (HP Server)
```bash
cd /home/aiadmin/attendance
sudo docker compose up -d --build
```

## Stack Details
| Service | Image | GPU |
|---|---|---|
| attendance-app | node:20-alpine | — |
| attendance-deepface | python:3.10-slim + tensorflow[and-cuda] | Quadro P1000 |
| attendance-postgres | postgres:16-alpine | — |

## Environment
```env
DATABASE_URL=postgresql://attendance:attendance_local_pass@postgres:5432/attendance
DEEPFACE_API_URL=http://attendance-deepface:5001
SESSION_SECRET=local_secret_change_me
```

## Local DB
- Engine: PostgreSQL 16
- Schema: `attendance`
- Tables: orgs, users, members, groups, member_groups, logs
- Data persisted in Docker volume: `attendance_postgres_data`

## SSL (Camera Access)
- Self-signed cert: `/etc/ssl/attendance-self.crt`
- nginx config: `/etc/nginx/sites-available/attendance-ssl`
- Port 4430 → localhost:3017
- Browser warning is expected — click Advanced → Proceed

## GPU Setup
- NVIDIA Quadro P1000 (4GB VRAM)
- nvidia-container-toolkit installed
- DeepFace uses tensorflow[and-cuda] for GPU inference
- ~0.3-0.5 sec per face identify (vs ~1-2 sec CPU)

## Anti-Spoofing
- Blink detection via MediaPipe Face Mesh (browser-side)
- EAR (Eye Aspect Ratio) threshold: open >0.25, closed <0.20
- Capture & Identify disabled until blink verified
- Resets after each successful identification

## TODO (Production Roadmap)
- [ ] Reports page + CSV export
- [ ] Configurable late time (currently hardcoded 8AM/9AM)
- [ ] Multi-org admin panel (for reselling)
- [ ] QR code print/generate per member
- [ ] IR camera support (Intel RealSense D435) for hardware liveness
