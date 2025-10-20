## PawSter Social Project — Hướng dẫn chạy sau khi clone

Dự án gồm Backend (Express/Socket.IO/MongoDB) và Frontend (Vite/React) trong thư mục `web/`.

### 1) Yêu cầu hệ thống (Prerequisites)
- Node.js 18+ (khuyến nghị 18 hoặc 20)
- MongoDB đang chạy local (mặc định `mongodb://localhost:27017`)
- Tài khoản AWS (tuỳ chọn) nếu muốn upload media lên S3 (có thể tắt nếu chưa cần)

### 2) Clone và cài đặt
```
git clone <repo-url>
cd PawSter_Social_Project
npm install
cd web
npm install
```

### 3) Tạo file môi trường
Tại thư mục gốc, tạo file `.env` (nếu chưa có):
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/threadsApp?directConnection=true

JWT_SECRET=your_jwt_secret
QR_SECRET=your_qr_secret
APP_URL=http://localhost:3000

# Cho phép tất cả CORS trong DEV (đã được hỗ trợ trong code)
FRONTEND_URL=*

# AWS S3 (tuỳ chọn). Nếu chưa dùng S3, có thể để trống hoặc bỏ qua
# AWS_ACCESS_KEY_ID=YOUR_KEY
# AWS_SECRET_ACCESS_KEY=YOUR_SECRET
# AWS_REGION=us-east-1
# AWS_S3_BUCKET_NAME=your-bucket
# S3_BASE_URL=https://your-bucket.s3.us-east-1.amazonaws.com

# MoMo (tuỳ chọn demo)
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENDPOINT=https://test-payment.momo.vn
MOMO_REDIRECT_URL=http://localhost:3000/api/payments/momo/return
MOMO_IPN_URL=http://localhost:3000/api/payments/momo/ipn

# URL front-end dev (thông tin cho bạn, không bắt buộc)
WEB_URL=http://localhost:5022
```

Tại thư mục `web/`, bạn có thể tạo `.env.development` (tuỳ chọn). Mặc định code đã dùng proxy Vite nên không cần cấu hình thêm:
```
# Tuỳ chọn: nếu muốn override, có thể đặt VITE_API_URL=http://localhost:3000/api
# Mặc định để trống sẽ dùng '/api' (proxy) => hoạt động tốt khi đổi IP trong LAN
```

### 4) Chạy Backend
Tại thư mục gốc dự án:
```
npm run dev
```
Backend sẽ chạy tại `http://localhost:3000` và lắng nghe trên `0.0.0.0` (các máy cùng mạng có thể truy cập).

### 5) Chạy Frontend (Vite)
Trong thư mục `web/`:
```
npm run dev
```
Vite chạy tại `http://localhost:5022` và bind `host: true` (thiết bị cùng mạng có thể truy cập qua IP máy dev: `http://<IP-may-ban>:5022`).

Frontend đã cấu hình proxy:
- REST API: `/api` -> `http://127.0.0.1:3000`
- Socket.IO: `/socket.io` -> `http://127.0.0.1:3000`

Điều này giúp bạn có thể mở trên điện thoại/máy khác trong cùng LAN mà không cần sửa IP trong code.

### 6) Đăng ký, đăng nhập, và Bootstrap Admin (tuỳ chọn)
- Đăng ký và đăng nhập qua API `/api/auth/*` hoặc giao diện web.
- Tạo admin lần đầu: gửi POST `/api/admin-bootstrap/self` với Bearer token của user đang đăng nhập. Hệ thống sẽ set `isAdmin=true` nếu chưa có admin nào tồn tại.

### 7) Upload Media lên S3 (tuỳ chọn)
- Điền các biến AWS trong `.env`.
- Khi server start, sẽ thử `HeadBucket` để kiểm tra kết nối S3. Nếu không cấu hình, media features liên quan S3 sẽ không hoạt động.

### 8) Thanh toán MoMo (demo/tuỳ chọn)
- Biến môi trường MoMo đã có mẫu test.
- Các route liên quan: `/api/payments/*`. Đây là demo; nếu triển khai production cần cấu hình thực tế và bảo mật kỹ.

### 9) CORS & WebSocket
- Trong dev, `FRONTEND_URL=*` cho phép tất cả origin để tiện thử nghiệm (khuyến cáo: chỉ dùng dev).
- Production nên chỉ định domain cụ thể vào `FRONTEND_URL`/`WEB_URL`.
- Socket.IO client trong frontend tự dùng origin hiện tại nếu không đặt `VITE_API_URL`, đi qua proxy `/socket.io`.

### 10) Troubleshooting
- ECONNREFUSED/ECONNRESET khi Vite proxy ws:
  - Đảm bảo backend lắng nghe `0.0.0.0` (đã cấu hình sẵn).
  - Kiểm tra firewall trên máy dev (mở port 3000/5022).
  - Kiểm tra xung đột port khác.
- Lỗi CORS:
  - Trong dev, bạn có thể dùng `FRONTEND_URL=*`.
  - Xem log server: sẽ in danh sách origin cho phép và origin bị chặn.
- Lỗi S3:
  - Đảm bảo `AWS_REGION`, `AWS_S3_BUCKET_NAME` và credentials hợp lệ.
- MongoDB:
  - Kiểm tra Mongo chạy local, connection string đúng (`MONGO_URI`).

### 11) Scripts
Tại gốc dự án:
```
npm run dev        # start backend với nodemon
npm start          # start backend production
npm run dev:test   # chạy backend với NODE_ENV=test
```
Tại `web/`:
```
npm run dev        # start Vite dev server (port 5022)
```

### 12) API tham khảo nhanh
Auth:
- POST /api/auth/register { username, email, password }
- POST /api/auth/login { email, password }

User:
- GET /api/users/me (Bearer)
- PATCH /api/users/me { username }
- GET /api/users/:id/friends
- POST /api/users/friends/:id/accept

QR/Friends:
- POST /api/qr/create (Bearer) -> trả token + QR base64
- POST /api/qr/scan { token }

Threads:
- POST /api/threads (multipart): content?, media[<=6]
- GET /api/threads
- DELETE /api/threads/:id

Profile:
- GET /api/users/me/profile
- PATCH /api/users/me/profile (multipart)

Payments (demo):
- POST /api/payments/create { provider?, amount? }
- POST /api/payments/webhook { paymentId, status }

---

Chúc bạn chạy dự án thuận lợi! Nếu muốn, mình có thể thêm README tiếng Anh/chi tiết hơn cho phần deploy.

## HTTPS Dev (WebRTC camera/mic qua LAN)

WebRTC (camera/mic) yêu cầu "secure context". Truy cập từ thiết bị khác trong LAN qua HTTP sẽ không xin được quyền camera/mic. Có 2 cách đơn giản để test qua LAN:

### Cách A: Dùng HTTPS dev với chứng chỉ tự ký (mkcert)

1) Cài mkcert: https://github.com/FiloSottile/mkcert

2) Tạo chứng chỉ cho dev server (ví dụ IP LAN máy bạn là 192.168.1.50):

```
cd web
mkdir certs
mkcert -install
mkcert -key certs/dev-key.pem -cert-file certs/dev-cert.pem 192.168.1.50 localhost 127.0.0.1
```

3) Chạy Vite với HTTPS:

Windows PowerShell (ví dụ):

```
$env:USE_HTTPS="1"
$env:VITE_DEV_HTTPS_CERT="$PWD/certs/dev-cert.pem"
$env:VITE_DEV_HTTPS_KEY="$PWD/certs/dev-key.pem"
npm run dev
```

Sau đó mở trên điện thoại: `https://192.168.1.50:5022` (chấp nhận cảnh báo do cert tự ký). Khi bấm gọi video, trình duyệt mới hiện popup xin quyền.

Lưu ý: iOS có thể yêu cầu tin cậy CA cục bộ của mkcert. Tham khảo tài liệu mkcert.

### Cách B: Dùng tunnel HTTPS (không cần tự tạo cert)

- Ngrok: https://ngrok.com/
- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- Localtunnel: https://github.com/localtunnel/localtunnel

Chạy Vite bình thường (HTTP), sau đó mở tunnel tới cổng 5022. Dùng URL https tunnel trên điện thoại để test WebRTC.

Mẹo: Tránh mở trong in-app browser (Facebook, Zalo). Hãy mở bằng Chrome/Safari gốc để quyền camera/mic hoạt động ổn định.
