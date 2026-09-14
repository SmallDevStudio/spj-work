# SPJ Work

ระบบบริหารงานภายในสำหรับ Superjeew Co., Ltd. รองรับงานทรัพยากรบุคคล การบริการพนักงาน และการจัดการโครงการในอนาคต

## Project Overview

SPJ Work ออกแบบสำหรับบริษัทผลิตรายการโทรทัศน์และคอนเทนต์ รองรับการใช้งานบนคอมพิวเตอร์ แท็บเล็ต และโทรศัพท์มือถือ

ระบบใช้แนวคิด Portal และ Workspace:

- SPJ Work Portal
- Employee Self-Service
- HR Management
- Organization Settings
- Projects Management ใน Phase ถัดไป

ผู้ใช้จะเห็นเฉพาะ Service, Menu และข้อมูลที่ได้รับอนุญาต

## Current Phase

กำลังพัฒนา HR Management Phase 1:

- ข้อมูลพนักงาน
- แผนก ตำแหน่ง และโครงสร้างองค์กร
- ระบบลาออนไลน์
- สิทธิ์ลาและ Leave Policy
- Approval Workflow แบบหลายขั้นตอน
- ปฏิทินวันลา
- วันหยุดประเทศไทยและวันหยุดบริษัท
- ประกาศภายในบริษัท
- Email และ LINE notifications
- Google Workspace user synchronization
- Role-based access control
- Audit logs
- Trash และ soft delete

## Application Structure

```text
/app
├── /me
│   ├── /profile
│   ├── /leave
│   ├── /calendar
│   └── /announcements
├── /hr
│   ├── /employees
│   ├── /organization
│   ├── /leave
│   ├── /calendar
│   ├── /announcements
│   ├── /reports
│   ├── /settings
│   └── /audit-logs
├── /projects
└── /settings
```
