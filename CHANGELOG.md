# Changelog

การเปลี่ยนแปลงที่สำคัญทั้งหมดของ SPJ Work จะถูกบันทึกไว้ในไฟล์นี้

รูปแบบเอกสารอ้างอิงจาก Keep a Changelog และโครงการใช้ Semantic Versioning

## [Unreleased]

### Added

- SPJ Work Service Portal ที่ `/app`
- Permission-aware service launcher
- Employee Self-Service workspace ที่ `/app/me`
- HR Management workspace ที่ `/app/hr`
- Organization Settings workspace ที่ `/app/settings`
- Route Groups สำหรับแยก Portal และ Workspace layouts
- Workspace-aware Sidebar และ Header
- Role `ADMIN` สำหรับผู้ดูแลระบบระดับบริษัท
- Permission สำหรับ Portal และแต่ละ Service
- Employee permission แบบ Own, Team และ All
- HR Settings permissions
- Google Workspace Sync permissions
- Responsive application shell สำหรับ Desktop, Tablet และ Mobile
- Permission-aware sidebar navigation
- Responsive header และ mobile navigation
- User menu พร้อมข้อมูลบัญชีและ Role
- Light และ Dark theme
- Secure logout workflow
- Root route redirect ตามสถานะ Session
- Firestore Security Rules แบบ server-only access
- Server-side permission guards
- Next.js route protection
- Security headers สำหรับ Production
- Firebase CLI configuration
- Firebase Admin SDK integration
- Google Workspace authentication foundation
- Emergency SUPERADMIN authentication
- Firebase Admin Session Cookie
- Signed CSRF token protection
- Request Origin และ Content-Type validation
- Platform user และ organization membership validation
- Role-based access control
- Effective permission calculation
- Permission Group foundation
- Login audit logging
- Soft-delete fields สำหรับข้อมูลสำคัญ
- Redux Toolkit session foundation
- Axios API client
- React Hook Form และ Zod validation
- Firebase Development environment
- Vercel deployment
- GitHub deployment workflow

### Changed

- เปลี่ยน authenticated landing page จาก `/dashboard` เป็น `/app`
- แยกเมนู Employee Self-Service ออกจาก HR Management
- จำกัด Employee ให้เข้าถึงเฉพาะข้อมูลและบริการของตนเอง
- จำกัด HR Management ตาม service และ data permissions
- เปิด Organization Settings เฉพาะ `ADMIN` และ `SUPERADMIN`
- เก็บ `/dashboard` เป็น legacy redirect ไป `/app`
- จำกัด Google sign-in ให้ใช้โดเมน `@superjeew.com`
- จำกัด Email/Password sign-in สำหรับ Emergency SUPERADMIN เท่านั้น
- แยก Firebase Client และ Firebase Admin environment variables
- แยก Redux store สำหรับ authenticated application
- กำหนด `firebase-admin` เป็นเวอร์ชัน `13.7.0` เพื่อรองรับ Vercel

### Security

- ตรวจ Permission ฝั่ง Server ก่อนเปิดแต่ละ Workspace
- ไม่ใช้ชื่อ Role เพื่อตรวจสิทธิ์ใน UI โดยตรง
- แยก System, Organization, HR และ Employee permissions
- เก็บ legacy `employee.read` ระหว่างการย้ายไปใช้ Own, Team และ All
- ใช้ `httpOnly`, `Secure`, `SameSite=Strict` และ Host-only Session Cookie
- ใช้ HMAC-signed CSRF token
- ตรวจ CSRF token ด้วย constant-time comparison
- ตรวจ Firebase ID token และ session revocationฝั่ง Server
- ตรวจการ Login ต้องเกิดภายใน 5 นาที
- ตรวจ User, Organization, Membership, Role และ Authentication Provider
- ปิดการอ่านและเขียน Firestore โดยตรงจาก Client
- ป้องกัน Secret และ Service Account key ไม่ให้ถูก commit
- บันทึก IP address และ User-Agent ใน Login Audit Log
- เพิ่ม HTTP security headers
- ปิด `X-Powered-By` header

### Fixed

- แก้ Firebase Admin SDK บน Vercelโดยกำหนดเวอร์ชัน `13.7.0`
- แก้ React ESLint ไม่ให้เข้าถึง `ref.current` ระหว่าง render
- แก้ Zod email validation ให้รองรับเวอร์ชันที่ติดตั้ง
- ป้องกัน Firebase Client และ Admin SDK initialize ซ้ำ
