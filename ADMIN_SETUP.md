# Admin Panel Setup Guide

## ✨ สิ่งที่สร้างเสร็จแล้ว

### 1. Database Schema
เพิ่มตารางใหม่ใน `src/db/schema.ts`:
- **testTypes** - ประเภทข้อสอบ (Focus on Form, Focus on Meaning, etc.)
- **questions** - ข้อสอบทั้งหมด
- **userAnswers** - คำตอบของผู้ใช้
- **testSessions** - ประวัติการทำข้อสอบ

### 2. API Routes
สร้าง API endpoints สำหรับจัดการข้อมูล:
- `GET/POST /api/admin/questions` - ดึงและสร้างข้อสอบ
- `GET/PUT/DELETE /api/admin/questions/[id]` - จัดการข้อสอบแต่ละข้อ
- `GET/POST /api/admin/test-types` - จัดการประเภทข้อสอบ
- `GET /api/admin/stats` - สถิติสำหรับ dashboard

### 3. Admin UI Pages
สร้างหน้าจัดการครบถ้วน:
- `/admin` - Dashboard หลักพร้อมสถิติ
- `/admin/questions` - รายการข้อสอบทั้งหมด (ค้นหา, กรอง, ลบ)
- `/admin/questions/new` - ฟอร์มเพิ่มข้อสอบใหม่
- `/admin/questions/[id]` - ฟอร์มแก้ไขข้อสอบ

### 4. Features
**Dashboard:**
- แสดงสถิติข้อสอบทั้งหมด
- จำนวนข้อสอบที่ใช้งาน
- จำนวนประเภทข้อสอบ
- จำนวนผู้ใช้งาน

**Question Management:**
- ✅ ค้นหาข้อสอบ
- ✅ กรองตามประเภทข้อสอบ
- ✅ กรองตามระดับความยาก
- ✅ เปิด/ปิดการใช้งานข้อสอบ
- ✅ แก้ไขข้อสอบ
- ✅ ลบข้อสอบ

**Question Form:**
- ✅ เลือกประเภทข้อสอบ
- ✅ กรอกโจทย์
- ✅ เพิ่ม/ลบตัวเลือก (ขั้นต่ำ 2 ตัวเลือก)
- ✅ เลือกคำตอบที่ถูกต้อง
- ✅ ระบุระดับความยาก (Easy, Medium, Hard)
- ✅ ระบุระดับ CEFR (A1-C2)
- ✅ เขียนคำอธิบายเฉลย
- ✅ กำหนดลำดับการแสดง

## 🚀 วิธีการใช้งาน

### ขั้นตอนที่ 1: Run Database Migrations
```bash
npm run db:push
# หรือ
npx drizzle-kit push:pg
```

### ขั้นตอนที่ 2: Seed ข้อมูลเริ่มต้น
```bash
npx tsx scripts/seed-admin.ts
```

สคริปต์นี้จะสร้าง:
- 4 ประเภทข้อสอบ (Focus on Form, Focus on Meaning, Form & Meaning, Listening)
- 10 ข้อสอบตัวอย่าง (5 ข้อสำหรับ Focus on Form, 5 ข้อสำหรับ Focus on Meaning)

### ขั้นตอนที่ 3: เข้าใช้งาน Admin Panel
เปิดเบราว์เซอร์และไปที่:
```
http://localhost:3000/admin
```

## 📋 การใช้งาน Admin Panel

### Dashboard (`/admin`)
- ดูสถิติภาพรวมของระบบ
- คลิกที่การ์ดเพื่อไปยังหน้าจัดการแต่ละส่วน

### จัดการข้อสอบ (`/admin/questions`)
1. **ดูรายการข้อสอบ**: แสดงข้อสอบทั้งหมดในรูปแบบตาราง
2. **ค้นหา**: พิมพ์คำค้นหาในช่องค้นหา
3. **กรอง**: เลือกประเภทข้อสอบหรือระดับความยาก
4. **เปิด/ปิดใช้งาน**: คลิกที่ปุ่มสถานะเพื่อเปิด/ปิดข้อสอบ
5. **แก้ไข**: คลิกไอคอนดินสอ
6. **ลบ**: คลิกไอคอนถังขยะ (จะมีการยืนยัน)

### เพิ่มข้อสอบใหม่ (`/admin/questions/new`)
1. เลือกประเภทข้อสอบ
2. กรอกโจทย์ข้อสอบ
3. กรอกตัวเลือก (สามารถเพิ่มได้มากกว่า 4 ตัวเลือก)
4. เลือกวงกลมหน้าคำตอบที่ถูกต้อง
5. เลือกระดับความยากและ CEFR
6. เขียนคำอธิบายเฉลย
7. คลิก "บันทึกข้อสอบ"

### แก้ไขข้อสอบ (`/admin/questions/[id]`)
- เหมือนกับการเพิ่มข้อสอบ แต่ข้อมูลจะถูกโหลดมาให้แล้ว
- สามารถเปลี่ยนสถานะเป็นใช้งาน/ปิดใช้งานได้

## 🎨 UI Design Features

### สีและธีม
- ใช้สีตามประเภทข้อสอบ:
  - **Focus on Form**: น้ำเงิน-ฟ้า (blue-cyan)
  - **Focus on Meaning**: เขียว-เขียวอมฟ้า (emerald-teal)
  - **Form & Meaning**: ม่วง-ชมพู (purple-pink)
  - **Listening**: ส้ม-เหลือง (orange-amber)

### Responsive Design
- ใช้งานได้ดีทั้งบนมือถือและคอมพิวเตอร์
- เมนูแบบ hamburger สำหรับมือถือ
- ตารางแบบ responsive

### User Experience
- Loading states ขณะดึงข้อมูล
- Confirmation dialogs ก่อนลบ
- Success/Error messages
- Form validation
- Smooth animations

## 🔧 การปรับแต่งเพิ่มเติม

### เพิ่มการ Authentication
ปัจจุบัน Admin Panel ยังไม่มีการตรวจสอบสิทธิ์ คุณควร:
1. เพิ่ม middleware ตรวจสอบ admin role
2. ใช้ NextAuth.js หรือ Auth0
3. เพิ่มฟิลด์ `isAdmin` ในตาราง users (มีอยู่แล้วใน schema)

### เพิ่มฟีเจอร์อื่นๆ
- **Bulk Import**: นำเข้าข้อสอบจาก CSV/Excel
- **Question Bank**: จัดกลุ่มข้อสอบ
- **Preview**: ดูตัวอย่างข้อสอบก่อนบันทึก
- **Duplicate**: คัดลอกข้อสอบ
- **Version History**: ประวัติการแก้ไข
- **Analytics**: สถิติการทำข้อสอบแต่ละข้อ

### เพิ่มการจัดการประเภทข้อสอบ
สร้างหน้า `/admin/test-types` สำหรับ:
- เพิ่ม/แก้ไข/ลบประเภทข้อสอบ
- กำหนดไอคอนและสี
- จัดลำดับการแสดง

## 📝 Database Schema Details

### questions table
```typescript
{
  id: number (auto)
  testTypeId: number (foreign key)
  sentence: string
  options: string[] (JSON)
  correctAnswer: number (index)
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  isActive: boolean
  orderIndex: number
  createdAt: timestamp
  updatedAt: timestamp
}
```

### testTypes table
```typescript
{
  id: number (auto)
  slug: string (unique)
  title: string
  description: string
  duration: string
  icon: string
  colorScheme: string
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

## 🎯 Next Steps

1. **Run migrations**: `npm run db:push`
2. **Seed data**: `npx tsx scripts/seed-admin.ts`
3. **Start dev server**: `npm run dev`
4. **Access admin**: http://localhost:3000/admin
5. **Add authentication** (recommended)
6. **Customize as needed**

## 💡 Tips

- ข้อสอบที่ปิดใช้งาน (`isActive: false`) จะไม่แสดงในหน้าทดสอบของผู้ใช้
- ใช้ `orderIndex` เพื่อจัดลำดับข้อสอบ
- CEFR levels: A1-A2 (Basic), B1-B2 (Independent), C1-C2 (Proficient)
- สามารถมีตัวเลือกได้มากกว่า 4 ตัวเลือก

## 🐛 Troubleshooting

**ปัญหา**: Database connection error
**แก้ไข**: ตรวจสอบ `.env` ว่ามี `DATABASE_URL` ถูกต้อง

**ปัญหา**: Seed script ไม่ทำงาน
**แก้ไข**: ตรวจสอบว่า run migrations แล้ว

**ปัญหา**: ไม่สามารถเข้า /admin ได้
**แก้ไข**: ตรวจสอบว่า Next.js dev server กำลังทำงาน
