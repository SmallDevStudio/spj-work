import fs from "node:fs/promises";

export const HEADERS = [
  "รหัสบริษัท*",
  "รหัสพนักงาน*",
  "อีเมลงาน*",
  "ชื่อ*",
  "นามสกุล*",
  "เพศ",
  "วันเกิด (YYYY-MM-DD)",
  "เบอร์โทร",
  "ตำแหน่ง",
  "รหัสแผนก",
  "รหัสพนักงานหัวหน้า",
  "รหัสเครื่องพิมพ์ 4 หลัก",
  "สถานะ",
  "วันที่มีผล (YYYY-MM-DD)",
  "หมายเหตุ",
];

const COMPANY_CODES = new Set(["SPJ01", "SPJ02"]);
const STATUSES = new Set(["ACTIVE", "INACTIVE", "ONBOARDING"]);

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
    } else if (char === '"' && value === "") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (inQuotes) {
    throw new Error("CSV มีเครื่องหมายคำพูดที่ไม่ปิด");
  }

  row.push(value.replace(/\r$/, ""));

  if (row.some((cell) => cell.trim())) {
    rows.push(row);
  }

  return rows;
}

export function normalizeDate(value) {
  let year;
  let month;
  let day;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const thai = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value);

  if (iso) {
    [, year, month, day] = iso;
    year = Number(year);
    month = Number(month);
    day = Number(day);
  } else if (thai) {
    [, day, month, year] = thai;
    day = Number(day);
    month = Number(month);
    year = Number(year);

    if (thai[3].length === 2) year += 2500;
    if (year >= 2400) year -= 543;
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

export function previewEmployeesCsv(csvText) {
  const rows = parseCsv(csvText);
  const header = rows.shift()?.map((cell) => cell.trim());

  if (
    !header ||
    HEADERS.some((expected, index) => header[index] !== expected) ||
    header.slice(HEADERS.length).some(Boolean)
  ) {
    throw new Error("หัวตารางไม่ตรงกับชีตพนักงานใน Template");
  }

  const errors = [];
  const warnings = [];
  const employeeCodes = new Set();
  const emails = new Set();
  const printerCodes = new Set();
  const employees = [];
  let blankRowsSkipped = 0;

  rows.forEach((row, index) => {
    if (row.every((cell) => !cell.trim())) {
      blankRowsSkipped += 1;
      return;
    }

    const line = index + 2;
    const data = Object.fromEntries(
      HEADERS.map((name, column) => [name, (row[column] ?? "").trim()]),
    );

    const company = data["รหัสบริษัท*"];
    const employeeCode = data["รหัสพนักงาน*"];
    const email = data["อีเมลงาน*"].toLowerCase();
    const printerCode = data["รหัสเครื่องพิมพ์ 4 หลัก"];

    const managerCodes = data["รหัสพนักงานหัวหน้า"]
      ? data["รหัสพนักงานหัวหน้า"].split(",").map((code) => code.trim())
      : [];

    const employeeKey = `${company}\u0000${employeeCode}`;
    const prefix = `แถว ${line}`;

    if (row.slice(HEADERS.length).some((cell) => cell.trim())) {
      errors.push(`${prefix}: มีข้อมูลในคอลัมน์นอก Template`);
    }

    if (!COMPANY_CODES.has(company)) {
      errors.push(`${prefix}: รหัสบริษัทไม่ถูกต้อง`);
    }

    if (!employeeCode) {
      errors.push(`${prefix}: ต้องกรอกรหัสพนักงาน`);
    }

    if (!data["ชื่อ*"] || !data["นามสกุล*"]) {
      errors.push(`${prefix}: ต้องกรอกชื่อและนามสกุล`);
    }

    if (!/^[a-z0-9._%+-]+@superjeew\.com$/i.test(email)) {
      errors.push(
        `${prefix}: ต้องเป็นอีเมล @superjeew.com ที่ไม่มีเครื่องหมายอื่นต่อท้าย`,
      );
    }

    if (employeeCodes.has(employeeKey)) {
      errors.push(`${prefix}: รหัสพนักงานซ้ำ`);
    }

    if (emails.has(email)) {
      errors.push(`${prefix}: อีเมลซ้ำ`);
    }

    employeeCodes.add(employeeKey);
    emails.add(email);

    for (const field of ["วันเกิด (YYYY-MM-DD)", "วันที่มีผล (YYYY-MM-DD)"]) {
      if (data[field] && !normalizeDate(data[field])) {
        errors.push(`${prefix}: ${field} ไม่ถูกต้อง`);
      }
    }

    const status = data["สถานะ"];

    if (status && !STATUSES.has(status)) {
      errors.push(`${prefix}: สถานะไม่ถูกต้อง`);
    }

    if (printerCode && !/^\d{4}$/.test(printerCode)) {
      errors.push(`${prefix}: รหัสเครื่องพิมพ์ต้องเป็นตัวเลข 4 หลัก`);
    }

    if (printerCode && printerCodes.has(printerCode)) {
      errors.push(`${prefix}: รหัสเครื่องพิมพ์ซ้ำ`);
    }

    if (printerCode) {
      printerCodes.add(printerCode);
    }

    if (managerCodes.some((code) => !code)) {
      errors.push(`${prefix}: มีรหัสหัวหน้าว่างระหว่างเครื่องหมายจุลภาค`);
    }

    if (new Set(managerCodes).size !== managerCodes.length) {
      errors.push(`${prefix}: ระบุหัวหน้าคนเดิมซ้ำ`);
    }

    if (employeeCode && managerCodes.includes(employeeCode)) {
      errors.push(`${prefix}: พนักงานเป็นหัวหน้าของตัวเอง`);
    }

    employees.push({
      line,
      company,
      employeeCode,
      managerCodes,
    });
  });

  if (!employees.length) {
    errors.push("ไม่มีข้อมูลพนักงาน");
  }

  const byCode = new Map();

  for (const employee of employees) {
    const matches = byCode.get(employee.employeeCode) ?? [];
    matches.push(employee);
    byCode.set(employee.employeeCode, matches);
  }

  for (const employee of employees) {
    for (const code of employee.managerCodes) {
      if (!code) continue;

      const matches = byCode.get(code) ?? [];

      if (!matches.length) {
        errors.push(`แถว ${employee.line}: ไม่พบรหัสหัวหน้า ${code} ในไฟล์`);
      } else if (
        !matches.some((person) => person.company === employee.company)
      ) {
        if (matches.length === 1) {
          warnings.push(
            `แถว ${employee.line}: หัวหน้า ${code} อยู่ต่างบริษัท (${matches[0].company})`,
          );
        } else {
          errors.push(
            `แถว ${employee.line}: รหัสหัวหน้า ${code} ซ้ำต่างบริษัท ต้องระบุบริษัทให้ชัดเจน`,
          );
        }
      }
    }
  }

  return {
    employeeCount: employees.length,
    blankRowsSkipped,
    multipleApproverEmployees: employees.filter(
      (employee) => employee.managerCodes.length > 1,
    ).length,
    errors,
    warnings,
  };
}

if (process.argv[1]?.endsWith("preview-employees-csv.mjs")) {
  const csvPath = process.argv[2];

  if (!csvPath) {
    throw new Error("ใช้: node scripts/preview-employees-csv.mjs employee.csv");
  }

  const result = previewEmployeesCsv(await fs.readFile(csvPath, "utf8"));

  console.log(JSON.stringify(result, null, 2));

  if (result.errors.length) {
    process.exitCode = 1;
  }
}
