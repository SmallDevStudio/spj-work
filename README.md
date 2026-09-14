# SPJ Work

ระบบบริหารทรัพยากรบุคคลและการจัดการโครงการภายในสำหรับ Superjeew Co., Ltd.

## Project Overview

SPJ Work ออกแบบสำหรับบริษัทผลิตรายการโทรทัศน์และคอนเทนต์ รองรับการใช้งานบนคอมพิวเตอร์ แท็บเล็ต และโทรศัพท์มือถือ

ระบบแบ่งออกเป็นสองส่วนหลัก:

1. HR Management
2. Project Management

ปัจจุบันอยู่ระหว่างการพัฒนา HR Management Phase 1

## HR Management Phase 1

- ข้อมูลพนักงาน
- แผนก ตำแหน่ง และโครงสร้างองค์กร
- ระบบลาออนไลน์
- สิทธิ์ลาและ Leave Policy
- Approval Workflow แบบหลายขั้นตอน
- ปฏิทินวันลา
- วันหยุดประเทศไทยและวันหยุดบริษัท
- ประกาศภายในบริษัท
- Email และ LINE notifications
- Role-based access control
- Audit logs
- Trash และ soft delete

## Technology Stack

- Next.js App Router
- JavaScript
- React
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Firebase Admin SDK `13.7.0`
- Firebase Cloud Functions
- Redux Toolkit
- Axios
- React Hook Form
- Zod
- React Icons
- Vercel
- GitHub

> `firebase-admin` ถูกกำหนดไว้ที่ `13.7.0` เนื่องจากเป็นเวอร์ชันที่ผ่านการทดสอบกับ Vercel ของโปรเจกต์นี้ ห้ามอัปเกรดโดยไม่ตรวจ Local และ Production build

## Authentication

พนักงานเข้าสู่ระบบด้วย Google Workspace:

```text
@superjeew.com
```

ระบบมี Email/Password แยกสำหรับ Emergency SUPERADMIN เท่านั้น

Authentication flow:

```text
Firebase Client Authentication
→ Firebase ID Token
→ CSRF และ Origin Validation
→ Firebase Admin Verification
→ User และ Membership Validation
→ Server Session Cookie
→ Permission Authorization
```

Firebase Client authentication ใช้ in-memory persistence เมื่อสร้าง Server Session สำเร็จแล้ว Client จะ sign out และใช้ `httpOnly` Session Cookie แทน

## Security

- Firebase Admin Session Cookie
- `HttpOnly` cookie
- `Secure` cookie บน Production
- `SameSite=Strict`
- Host-only cookie
- HMAC-signed CSRF token
- Constant-time token comparison
- Request Origin validation
- JSON Content-Type validation
- Firebase token revocation check
- Recent authentication validation
- Google Workspace domain validation
- User, Membership และ Organization status validation
- Server-side Role และ Permission validation
- Firestore Client access แบบ deny all
- HTTP security headers
- Secrets เก็บใน Environment Variables
- Audit log สำหรับการ Login
- Soft delete สำหรับข้อมูลสำคัญ

## Roles

- `SUPERADMIN`
- `HR_ADMIN`
- `HR_OFFICER`
- `MANAGER`
- `APPROVER`
- `EMPLOYEE`
- `AUDITOR`

ระบบใช้ Role ร่วมกับ:

- Role permissions
- Permission Groups
- Direct permissions
- Denied permissions

ผลลัพธ์สุดท้ายถูกคำนวณเป็น `effectivePermissions`

## Data Architecture

```text
organizations/{organizationId}
users/{uid}
organizations/{organizationId}/memberships/{uid}
organizations/{organizationId}/permissionGroups/{groupId}
organizations/{organizationId}/auditLogs/{auditLogId}
```

`User` และ `Employee` เป็นข้อมูลคนละประเภท:

- `User` คือบัญชีเข้าใช้ระบบ
- `Membership` คือสิทธิ์ภายใน Organization
- `Employee` คือข้อมูลพนักงานใน HR Module

## Architecture Principles

- UI Component ห้ามเชื่อม Firestore โดยตรง
- Client ติดต่อข้อมูลผ่าน API layer
- API ตรวจ Authentication และ Permission ฝั่ง Server
- Repository รับผิดชอบการเข้าถึงข้อมูล
- Service รับผิดชอบ Business Logic
- ข้อมูลธุรกิจต้องมี Organization scope
- ข้อมูลสำคัญใช้ soft delete
- การเปลี่ยนแปลงสำคัญต้องสร้าง Audit Log
- Firestore Security Rules ใช้เป็น defense-in-depth
- Firebase Functions ใช้ `asia-southeast1`
- เพิ่มเฉพาะไฟล์และ Dependency ที่ใช้งานจริง

## Current Project Structure

```text
src/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth/
│   │       └── system/
│   ├── dashboard/
│   ├── login/
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   ├── auth/
│   └── layout/
├── config/
├── constants/
├── lib/
│   ├── auth/
│   ├── axios/
│   ├── firebase/
│   ├── security/
│   └── utils/
├── providers/
├── repositories/
│   └── auth/
├── services/
│   └── auth/
└── store/
    └── slices/

scripts/
└── bootstrap-superadmin.mjs
```

## Environment Variables

สร้าง `.env.local` ในเครื่องโดยอ้างอิงจาก `.env.example`

### Firebase Client

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

### Firebase Admin

```text
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

### Application Security

```text
CSRF_SECRET
APP_ALLOWED_ORIGINS
EMERGENCY_SUPERADMIN_EMAIL
```

ห้าม commit:

```text
.env.local
Service Account JSON
Private Key
Password
API Secret
```

## Local Development

ติดตั้ง dependencies:

```bash
npm install
```

เริ่ม Development Server:

```bash
npm run dev
```

เปิด:

```text
http://localhost:3000
```

## Firebase Deployment

Deploy Firestore Security Rules:

```bash
npx firebase deploy --only firestore:rules
```

ระบบใช้ Vercel สำหรับ Web Hosting จึงไม่ใช้ Firebase Hosting

## Quality Checks

ก่อน commit ทุกครั้ง:

```bash
npm run lint
```

```bash
npm run build
```

ต้องผ่านทั้งสองคำสั่งก่อน push GitHub

## Deployment Workflow

```text
Local development
→ ESLint
→ Production build
→ Git commit
→ GitHub main
→ Vercel production deployment
→ Production verification
```

เมื่อ push เข้า branch `main` Vercel จะสร้าง Production Deployment อัตโนมัติ

## Development Status

### Completed

- Project Foundation
- Core Dependencies
- Firebase Development Project
- Firebase Client SDK
- Firebase Admin SDK
- Emergency SUPERADMIN Bootstrap
- Google Workspace Authentication Foundation
- Secure Server Session
- CSRF Protection
- User and Membership Authorization
- Effective Permission Calculation
- Firestore Security Rules
- API Permission Guards
- Route Protection
- Responsive Application Shell
- Permission-aware Sidebar
- Responsive Header
- Mobile Navigation
- User Menu
- Light and Dark Theme
- GitHub Deployment
- Vercel Deployment

### In Progress

- HR Management Phase 1

### Next Module

- Organization Structure
- Departments
- Positions
- Employee Management

## Versioning

โปรเจกต์ใช้ Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

ตัวอย่าง:

- `0.1.0` — Development foundation
- `0.2.0` — Employee Module
- `0.3.0` — Leave Module
- `1.0.0` — HR Phase 1 พร้อมใช้งานจริง

รายละเอียดการเปลี่ยนแปลงดูได้จาก [CHANGELOG.md](./CHANGELOG.md)

## Current Version

```text
0.1.0
```

## Organization

Superjeew Co., Ltd.

Internal use only.
