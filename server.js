// server.js — بوابة استعلام نتائج الطلاب
// باك اند بسيط: بيرجع بيانات طالب واحد بس عند إدخال كود الطالب الصحيح.
// أي متصفح فاتح الموقع محدش يقدر يشوف بيانات باقي الطلاب لإن البيانات كلها
// محفوظة على السيرفر وبترجع للمتصفح استجابة واحدة بس لكل طلب.

const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------
// تحميل بيانات الطلاب من الملف مرة واحدة في الذاكرة عند تشغيل السيرفر
// ---------------------------------------------------------------------
const DATA_PATH = path.join(__dirname, 'data', 'students.json');
let students = {};
try {
  students = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  console.log(`تم تحميل بيانات ${Object.keys(students).length} طالب.`);
} catch (err) {
  console.error('تعذّر تحميل ملف بيانات الطلاب:', err.message);
}

// ---------------------------------------------------------------------
// حماية بسيطة من محاولات التخمين المتكررة (Brute force) لكود الطالب
// ---------------------------------------------------------------------
const lookupLimiter = rateLimit({
  windowMs: 60 * 1000, // دقيقة واحدة
  max: 15,             // أقصى 15 محاولة استعلام لكل IP في الدقيقة
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'محاولات كتير في وقت قصير، استنى شوية وجرب تاني.' }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// تطبيع كود الطالب (إزالة مسافات، توحيد الشكل)
function normalizeCode(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, '');
}

// إخفاء الحقول الحساسة اللي مش لازم تتعرض في الواجهة (الرقم القومي كامل)
function sanitizeStudent(student) {
  const { nationalId, ...rest } = student;
  return {
    ...rest,
    nationalIdMasked: nationalId
      ? nationalId.slice(0, 3) + '••••••••' + nationalId.slice(-3)
      : null
  };
}

app.post('/api/result', lookupLimiter, (req, res) => {
  const code = normalizeCode(req.body && req.body.code);

  if (!code) {
    return res.status(400).json({ ok: false, message: 'من فضلك أدخل كود الطالب.' });
  }

  const student = students[code];

  if (!student) {
    return res.status(404).json({ ok: false, message: 'الكود المدخل غير صحيح أو غير موجود.' });
  }

  return res.json({ ok: true, student: sanitizeStudent(student) });
});

// أي مسار تاني يرجّع صفحة الواجهة (SPA بسيطة)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`الموقع شغال على المنفذ ${PORT}`);
});
