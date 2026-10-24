# SPJ Work

ระบบภายในสำหรับ SuperJeew (SPJ01) และ SuperJeew Event (SPJ02) ใช้องค์กรเดียวกันใน Firestore และจำกัดการมองเห็นข้อมูลตามบริษัทและสิทธิ์บัญชี

## สถานะปัจจุบัน

- Portal ที่ `/` และบริการส่วนตัวภายใต้ `/<userId>/leave` และ `/<userId>/notifications` (`userId` คือ Firebase Auth UID)
- จัดการพนักงาน แผนก บริษัท สิทธิ์เข้าถึง การมอบหมายงานอนุมัติ และการลาภายใต้ `/manage`
- ตั้งค่าแอปที่ `/settings`; API แบ่งตามโมดูลที่ `/api/v1/{auth,access,company,department,employee,leave,notifications}`
- ข้อมูลวันลา: ประเภท Template การมอบหมาย ยอดนำเข้า/ยอดปรับ วันหยุด ตารางวันทำงาน ฉบับร่าง การส่งใบลา การอนุมัติ ประวัติ และการลบแบบเก็บร่องรอย
- งาน Assets, Helpdesk/IT, Projects และการปรับ UX ของ Manage ยังอยู่ในแผนพัฒนา

การแจ้งเตือนใบลาในปัจจุบันแสดง **ภายในแอป** ผ่าน notification outbox; ยังไม่มีการส่งอีเมลหรือ LINE จริง ระบบ Bearer token/API key สำหรับแอปภายนอกยังไม่ได้เปิดใช้

## เริ่มต้นบนเครื่อง

ต้องมี Node.js 24, Firebase Development project, Firebase Auth และ Firestore ที่เตรียมข้อมูลองค์กร/สิทธิ์ไว้แล้ว

```powershell
git switch feat/portal-ux
git pull --ff-only origin feat/portal-ux
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
# กรอกค่าจริงใน .env.local โดยไม่ commit ไฟล์นี้
npm run dev
```

ตัวแปร Firebase Admin, CSRF, origin และอีเมล emergency admin จำเป็นต้องกำหนดตาม `.env.example` สำหรับการใช้งานจริง `APP_ALLOWED_ORIGINS` ใส่ origin เช่น `http://localhost:3000` (ไม่มี path) ส่วน `FIREBASE_ADMIN_PRIVATE_KEY` ใช้ private key ของ service account ที่ได้รับอนุญาต อย่าใส่ key ใน Git ถ้ามี `.env.local` อยู่แล้ว ไม่ต้องคัดลอกทับ

สำหรับหน้า Dev Test ให้ใช้ Firebase project สำหรับทดสอบที่ ID ลงท้าย `-dev` หรือ `-test`, ตั้ง `LEAVE_DEV_TEST_ENABLED=true` ใน `.env.local`, รัน `npm run dev` และลงชื่อเข้าใช้ด้วย SUPERADMIN หน้า `/manage/leave/dev-test` ไม่เปิดใน production build

## ตรวจโค้ด

```powershell
npm run lint
npm run check:boundaries
npm run build
```

ดู [คู่มือทดสอบระบบลา](docs/LEAVE_TESTING.md), [โครงสร้างโมดูลและ API](docs/API_AND_MODULE_BOUNDARIES.md) และ [บันทึกการเปลี่ยนแปลง](CHANGELOG.md) ก่อนทดสอบกับข้อมูลจริง
