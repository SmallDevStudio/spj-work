# Changelog

การเปลี่ยนแปลงที่สำคัญทั้งหมดของ SPJ Work จะถูกบันทึกไว้ในไฟล์นี้

รูปแบบเอกสารอ้างอิงจาก Keep a Changelog และโครงการใช้ Semantic Versioning สำหรับการกำหนดเวอร์ชัน

## [Unreleased]

### Added

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

- จำกัด Google sign-in ให้ใช้โดเมน `@superjeew.com`
- จำกัด Email/Password sign-in สำหรับ Emergency SUPERADMIN เท่านั้น
- แยก Firebase Client และ Firebase Admin environment variables
- แยก Redux store สำหรับ authenticated application
- กำหนด `firebase-admin` เป็นเวอร์ชัน `13.7.0` เพื่อรองรับ Vercel

### Security

- ใช้ `httpOnly`, `Secure`, `SameSite=Strict` และ Host-only Session Cookie
- ใช้ HMAC-signed CSRF token
- ตรวจ CSRF token ด้วย constant-time comparison
- ตรวจ Firebase ID token และ session revocation ฝั่ง Server
- ตรวจการ Login ต้องเกิดภายใน 5 นาที
- ตรวจ User, Organization, Membership, Role และ Authentication Provider ก่อนสร้าง Session
- ปิดการอ่านและเขียน Firestore โดยตรงจาก Client
- ป้องกัน Secret และ Service Account key ไม่ให้ถูก commit
- บันทึก IP address และ User-Agent ใน Login Audit Log
- เพิ่ม HTTP security headers
- ปิด `X-Powered-By` header

### Fixed

- แก้ Firebase Admin SDK บน Vercel โดยกำหนดเวอร์ชัน `13.7.0`
- แก้ React ESLint ไม่ให้เข้าถึง `ref.current` ระหว่าง render
- แก้ Zod email validation ให้รองรับเวอร์ชันที่ติดตั้ง
- ป้องกัน Firebase Client และ Admin SDK initialize ซ้ำ
