# แนวทางเชื่อม Google Workspace Directory

สถานะ: แบบออกแบบสำหรับงานถัดไป ยังไม่ได้เชื่อม API หรือซิงก์ข้อมูลจริง

## สิทธิ์และการเชื่อมต่อ

- เปิด Admin SDK Directory API ใน Google Cloud project ที่ใช้เชื่อมต่อ
- ตั้ง service account พร้อม Domain-wide Delegation โดย Super Admin ของ Workspace และให้ scope `admin.directory.user.readonly` เท่านั้น
- เก็บ credential ฝั่ง server และบันทึกผู้ใช้ Workspace ที่ใช้ impersonate ใน environment; ห้ามส่ง credential ผ่าน browser
- `/settings` แสดงสถานะ connection, ตรวจการเข้าถึง, วันซิงก์ล่าสุด, และตัวอย่างข้อมูลก่อนยืนยันนำเข้า

## ขอบเขตข้อมูล

- นำเข้าเฉพาะบัญชีบุคคลที่ผ่านกฎบริษัทและโดเมน `@superjeew.com` ที่ตกลงไว้; กรองบัญชี service/shared, suspended และ alias
- ใช้ `users.list` พร้อม `customer=my_customer`, `projection=full` หรือ `custom` เฉพาะฟิลด์ที่อนุญาต และวน `nextPageToken` จนครบ
- จับคู่ด้วย immutable `workspaceUserId` ก่อน; เมื่อเชื่อมครั้งแรกจึงจับคู่ด้วยอีเมลหลักหรือรหัสพนักงานใน `externalIds`/custom schema และให้ HR ตรวจรายการที่กำกวม
- Workspace ให้ชื่อ อีเมล ตำแหน่ง แผนก โทรศัพท์ และรูปได้ถ้ามีการกรอก; บริษัทใน SPJ01/SPJ02 และรหัสพนักงานต้องมีกฎ mapping ชัดเจน ไม่เดาจากชื่อแผนกหรือ OU
- รูปจาก Workspace อาจเป็น URL ที่ต้องยืนยันตัวตน/หมดอายุ ควรดึงผ่าน Directory photos API แล้วเก็บใน Storage ของระบบพร้อมบันทึกเจ้าของข้อมูล

## นโยบายซิงก์

1. รอบแรกเป็น preview: NEW / MATCHED / CONFLICT / SKIPPED แล้วให้ผู้ดูแลยืนยัน
2. สำหรับพนักงานใหม่ สร้างเอกสารด้วย Workspace ID แบบ idempotent; ถ้ารหัสพนักงานหรือบริษัทไม่แน่ชัดให้ค้างเป็นรายการรอตรวจ ไม่เปิดสิทธิ์เข้าใช้ทันที
3. สำหรับพนักงานเดิม ค่าเริ่มต้นคือ `CREATE_ONLY` หรือ `FILL_EMPTY` เฉพาะฟิลด์ที่ HR อนุญาตและยังว่าง ห้ามแทนที่ค่า HR กรอกเอง
4. เก็บ `source`, `lastSyncedAt`, `workspaceUserId`, และ audit ของทุกฟิลด์ที่เปลี่ยน รวมทั้ง preview ก่อน apply
5. รอบถัดไปตรวจบัญชีใหม่จาก Workspace และใช้ ID ป้องกันการสร้างซ้ำ; รองรับ event ADD/UPDATE จาก `users.watch` พร้อมรอบ reconciliation เป็นระยะเพื่อชดเชย event ที่พลาด
6. การหายไปหรือถูก suspend ใน Workspace ให้แจ้งเตือน HR ก่อน ไม่ลบ employee/ประวัติการลาอัตโนมัติ

## ข้อควรระวัง

Directory user ไม่มีฟิลด์ HR ทุกช่อง เช่น สิทธิ์วันลา ประเภทการจ้าง และบริษัทภายใน ต้องใช้ข้อมูล HR เป็นแหล่งจริงสำหรับฟิลด์เหล่านั้น Firebase Auth login ที่มีอยู่แยกจากการอ่าน Admin Directory; ต้องตั้งสิทธิ์ API เพิ่มต่างหาก
