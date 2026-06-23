# AttendTrack — Generic Attendance System
> Smart Face + QR Attendance for any organization.

**Live Demo:** https://attendance.powerlife-shop.com  
**Local:** http://100.115.50.106:3017  
**Stack:** Next.js 14 · DeepFace (ArcFace) · Supabase (schema: attendance) · Docker · Cloudflare Tunnel  
**Repo:** https://github.com/enusent-edu/attendance  

## Use Cases
- Schools (classes/sections)
- Offices (departments/shifts)
- Clinics (staff attendance)
- Events (participant tracking)

## Features
- Dashboard with live stats
- Members management + Face enrollment (ArcFace)
- Groups (section, dept, shift, event)
- Attendance — Face Recognition + QR Code
- Reports + CSV export

## Attendance Methods (per group)
- **Face Only** — DeepFace ArcFace, RetinaFace detector
- **QR Only** — scan member QR code
- **Face + QR** — both allowed
- **Manual** — admin logs manually

## Default Login
- Email: admin@attendance.demo
- Password: admin123

## Ports
- 3017: attendance-app (Next.js)
- 5002: attendance-deepface (Flask, internal)

## Deploy
```bash
cd /home/aiadmin/attendance
sudo docker compose up -d --build
```
