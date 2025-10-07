# Threads App Backend

Backend API for a Threads-like mobile application with QR friend system and Pro upgrade.

## Features
- JWT Auth (register/login)
- User profile & friends list
- Friend requests via signed QR codes (HMAC + TTL 1h)
- Friend limits: 20 (Free) / 200 (Pro)
- Payment simulation to unlock Pro (webhook sets isPro)
- Threads (posts) CRUD subset: create, list, delete own
- Swagger docs placeholder at `/api/docs`

## Tech Stack
Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, qrcode, Swagger

## Quick Start

1. Clone repo or copy folder
2. Create `.env` from example:
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/threadsApp
JWT_SECRET=supersecret
QR_SECRET=qrsecretkey
APP_URL=http://localhost:3000

# AWS S3 (provide your own values)
AWS_ACCESS_KEY_ID=YOUR_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=your-bucket-name
# Optional CloudFront or custom domain base (omit trailing slash)
# AWS_S3_BASE_URL=https://cdn.yourdomain.com
```
3. Install dependencies:
```
npm install
```
4. Run dev server:
```
npm run dev
```
Or production:
```
npm start
```

Server log:
```
🚀 Threads API is running on http://localhost:3000
```

## API Overview
Auth:
- POST /api/auth/register { username, email, password }
- POST /api/auth/login { email, password }

User:
- GET /api/users/me (Bearer token)
- PATCH /api/users/me { username }
- GET /api/users/:id/friends
- POST /api/users/friends/:id/accept (accept friend request by requestId)

QR / Friend Flow:
- POST /api/qr/create -> returns token + base64 QR (Bearer)
- POST /api/qr/scan { token } -> creates friend request

Threads:
- POST /api/threads multipart/form-data:
	- content (text, optional if media present)
	- media (up to 6 files: images/video/audio)
- GET /api/threads
- DELETE /api/threads/:id

Payments:
- POST /api/payments/create { provider?, amount? }
- POST /api/payments/webhook { paymentId, status }

## Friend Limits
Automatically enforced. Upgrade via payment webhook to set `isPro=true` (+ badge, extended limit 200).

## Notes
- Payment is a mock; integrate real gateway later.
- Add rate limiting & input validation for production.
- Enhance Swagger by adding JSDoc annotations in controllers/routes.
- Media uploads stored directly in S3 with public-read ACL (adjust to signed URLs for production security if needed). Max 6 files, 25MB each. Supported: images (jpeg/png/gif/webp/avif/svg), video (mp4/webm/quicktime/ogg), audio (mp3/mpeg/wav/ogg/webm/aac).

## License
MIT
