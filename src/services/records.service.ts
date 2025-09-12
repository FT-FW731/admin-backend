import fs from "fs";
import XLSX from "xlsx";
import moment from "moment";
import prisma from "../db/index.js";
import { Prisma } from "@prisma/client";
import { chunkArray } from "../utils/helpers.js";

// Helper: normalize business nature value into string[]
function normalizeBusinessNatures(val: any): string[] {
  // If already an array of strings
  if (Array.isArray(val))
    return val
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);

  if (typeof val !== "string") return [];

  const trimmed = val.trim();
  // JSON array string like "['Retail Business','Wholesale Business']" or '["a","b"]'
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(
        // convert single quotes to double quotes to help parse "['a','b']"
        trimmed.replace(/'/g, '"')
      );
      if (Array.isArray(parsed))
        return parsed
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean);
    } catch (e) {
      // fallback to comma split
    }
  }
  // Comma separated string
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // Single value
  return trimmed ? [trimmed] : [];
}

export const RECORD_TYPES = ["mca", "iec", "gst"] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

// Parse records from uploaded file (xlsx, xls, csv)
export async function parseRecordsFromFile(
  file: Express.Multer.File
): Promise<any[]> {
  const ext = file.originalname.split(".").pop()?.toLowerCase();
  let records: any[] = [];

  if (ext === "xlsx" || ext === "xls") {
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    records = XLSX.utils.sheet_to_json(sheet);
  } else if (ext === "csv") {
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    records = XLSX.utils.sheet_to_json(sheet);
  } else {
    throw new Error("Unsupported file type");
  }
  return records;
}

// Helper function to parse date strings using moment
function parseDate(
  dateStr: string | number | Date | undefined
): string | undefined {
  if (!dateStr) return undefined;

  const IST_OFFSET_MIN = 330; // +5:30

  // Helper to format moment as YYYY-MM-DD after converting to IST and taking day-start
  function toIstDateString(m: moment.Moment) {
    return m.utcOffset(IST_OFFSET_MIN).startOf("day").format("YYYY-MM-DD");
  }

  // If already a Date object -> treat as instant, convert to IST-day and return YYYY-MM-DD
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return undefined;
    return toIstDateString(moment(dateStr));
  }

  // Handle Excel date numbers and timestamps
  if (typeof dateStr === "number") {
    // If it's a plausible timestamp (milliseconds since epoch)
    if (dateStr > 1000000000000) {
      return toIstDateString(moment.utc(dateStr));
    }
    // Excel dates: days since 1899-12-30
    const m = moment.utc("1899-12-30").add(dateStr, "days");
    return m.isValid() ? toIstDateString(m) : undefined;
  }

  if (typeof dateStr === "string") {
    // Handle D/M/YYYY, DD/MM/YYYY or MM/DD/YYYY (try MM/DD first, then DD/MM)
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      let m = moment(dateStr, "MM/DD/YYYY", true);
      if (!m.isValid()) m = moment(dateStr, "DD/MM/YYYY", true);
      if (m.isValid()) return toIstDateString(m);
    }

    // Handle YYYY-MM-DD (date-only) -> interpret as that date in IST
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const m = moment(dateStr, "YYYY-MM-DD", true);
      if (m.isValid()) return toIstDateString(m);
    }

    // Handle ISO format (with time/zone) -> convert instant to IST then take IST day-start
    if (moment(dateStr, moment.ISO_8601, true).isValid()) {
      return toIstDateString(moment(dateStr));
    }

    // Try native Date parsing as fallback
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return toIstDateString(moment(d));
  }

  return undefined;
}

// Transform records for mcaNewLeads table
export function transformMcaRecords(records: any[]): any[] {
  return records.map((record) => ({
    company: record.Company || "",
    cin: record.CIN,
    cEmail: record.CEmail || null,
    dateOfRegistration: parseDate(record["DATE OF REGISTRATION"]),
    roc: record.ROC || null,
    category: record.CATEGORY || null,
    class: record.CLASS || null,
    subcategory: record.SUBCATEGORY || null,
    authorizedCapital: record["AUTHORIZED CAPITAL"]?.toString() || null,
    paidupCapital: record["PAIDUP CAPITAL"]?.toString() || null,
    activityCode: record["ACTIVITY CODE"]?.toString() || null,
    activityDescription: record["ACTIVITY DESCRIPTION"] || null,
    dateJoin: parseDate(record["DATE JOIN"]),
    registeredOfficeAddress: record["Registered Office Address"] || null,
    typeCompany: record["TYPE COMPANY"] || null,
    din: record.DIN?.toString() || null,
    directorName: record["DIRECTOR NAME"] || null,
    designation: record.DESIGNATION || null,
    dateOfBirth: parseDate(record["Date Of Birth"]),
    mobile: record.Mobile?.toString() || null,
    email: record.Email || null,
    gender: record.Gender || null,
    pincode: record.PINCODE?.toString() || null,
    city: record.City || null,
    state: record.State || null,
    country: record.COUNTRY || null,
  }));
}

export function transformIecRecords(records: any[]): any[] {
  return records.map((record) => ({
    iecCode: record.IEC,
    pan: record.PAN ?? null,
    firmName: record["FIRM NAME"] ?? null,
    email: record.EMAIL?.toString() ?? null,
    mobile: record.MOBILE?.toString() ?? null,
    status: record.STATUS?.toString() ?? null,
    issueDate: parseDate(record["ISSUE DATE"]) ?? null,
    fileNumber: record["FILE NUMBER"] ?? null,
    dgftRaOffice: record["DGFT RA Office"]?.toString() ?? null,
    dob: parseDate(record["DOB"]) ?? null,
    cancelledDate: parseDate(record["CANCELLED DATE"]) ?? null,
    suspendedDate: parseDate(record["SUSPENDED DATE"]) ?? null,
    fileDate: parseDate(record["FILE DATE"]) ?? null,
    nature: record.NATURE ?? null,
    category: record.CATEGORY ?? null,
    pincode: record.PINCODE?.toString() ?? null,
    address: record.ADDRESS ?? null,
  }));
}

export function transformGstBasicRecords(records: any[]): any[] {
  return records.map((record) => ({
    gstin: record.GSTIN?.toString(),
    registrationDate: parseDate(record["Registration Date"]) ?? null,
    pan: record.PAN?.toString() ?? null,
    mobile: record.Mobile?.toString() ?? null,
    email: record.Email?.toString() ?? null,
    legalName: record["Legal Name"] ?? null,
    tradeName: record["Trade Name"] ?? null,
    businessConstitution: record["Business constitution"] ?? null,
    businessNatures: normalizeBusinessNatures(record["Business Nature"]),
    pincode: record.Pincode?.toString() ?? null,
    address: record.Address ?? null,
  }));
}

// Map record types to their transform functions
const transformMap: Record<RecordType, (records: any[]) => any[]> = {
  mca: transformMcaRecords,
  iec: transformIecRecords,
  gst: transformGstBasicRecords,
};

// Map record types to their prisma models
const prismaModelMap: Record<RecordType, any> = {
  mca: prisma.mcaNewLeads,
  iec: prisma.iecLead,
  gst: prisma.gstBasic,
};

// Mandatory fields mapping for each record type
const mandatoryFieldsMap: Record<RecordType, string[]> = {
  mca: ["CIN", "DIN"],
  iec: ["IEC"],
  gst: ["GSTIN"],
};

// Generic validator function
function validateRecordsByType(type: RecordType, records: any[]): any[] {
  const mandatoryFields = mandatoryFieldsMap[type];
  return records.filter((record) =>
    mandatoryFields.every(
      (field) =>
        record[field] !== undefined &&
        record[field] !== null &&
        record[field] !== ""
    )
  );
}

// Map record types to their validator functions
const validatorMap: Record<RecordType, (records: any[]) => any[]> = {
  mca: (records) => validateRecordsByType("mca", records),
  iec: (records) => validateRecordsByType("iec", records),
  gst: (records) => validateRecordsByType("gst", records),
};

// Insert records by type (mca, iec, gst)
export async function insertRecordsByType(
  type: RecordType,
  records: any[]
): Promise<number> {
  const model = prismaModelMap[type];
  if (!model) throw new Error("Unsupported record type");

  // Handle raw SQL batch upsert for mca, iec and gst to update existing rows (like existing mca logic)
  if (
    records.length > 0 &&
    (type === "mca" || type === "iec" || type === "gst")
  ) {
    const BATCH_SIZE = 500;
    let processed = 0;

    // Helper to escape values for SQL (basic)
    function escape(val: any) {
      if (val === null || val === undefined) return "NULL";
      if (val instanceof Date)
        return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
      if (typeof val === "number") return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    }

    // Prepare columns, table name, exclude columns for update and value rows per type
    let tableName = "";
    let columns: string[] = [];
    let excludeFromUpdate: string[] = [];
    let valueRows: any[][] = [];
    const now = new Date();

    if (type === "mca") {
      tableName = "mca_new_leads";
      columns = [
        "company",
        "cin",
        "company_email",
        "date_of_registration",
        "roc",
        "category",
        "class",
        "subcategory",
        "authorized_capital",
        "paidup_capital",
        "activity_code",
        "activity_description",
        "date_join",
        "registered_office_address",
        "type_company",
        "din",
        "director_name",
        "designation",
        "date_of_birth",
        "mobile",
        "email",
        "gender",
        "pincode",
        "city",
        "state",
        "country",
        "created_at",
        "updated_at",
      ];
      excludeFromUpdate = ["cin", "din"];
      valueRows = records.map((r) => [
        r.company,
        r.cin,
        r.cEmail,
        r.dateOfRegistration ?? null,
        r.roc,
        r.category,
        r.class,
        r.subcategory,
        r.authorizedCapital,
        r.paidupCapital,
        r.activityCode,
        r.activityDescription,
        r.dateJoin ?? null,
        r.registeredOfficeAddress,
        r.typeCompany,
        r.din,
        r.directorName,
        r.designation,
        r.dateOfBirth ?? null,
        r.mobile,
        r.email,
        r.gender,
        r.pincode,
        r.city,
        r.state,
        r.country,
        now,
        now,
      ]);
    } else if (type === "iec") {
      tableName = "iec_leads";
      columns = [
        "iec_code",
        "pan",
        "firm_name",
        "email",
        "mobile",
        "status",
        "issue_date",
        "file_number",
        "dgft_ra_office",
        "address",
        "dob",
        "cancelled_date",
        "suspended_date",
        "file_date",
        "nature",
        "category",
        "pincode",
        "created_at",
        "updated_at",
      ];
      excludeFromUpdate = ["iec_code"];
      valueRows = records.map((r) => [
        r.iecCode,
        r.pan ?? null,
        r.firmName ?? null,
        r.email ?? null,
        r.mobile ?? null,
        r.status ?? null,
        r.issueDate ?? null,
        r.fileNumber ?? null,
        r.dgftRaOffice ?? null,
        r.address ?? null,
        r.dob ?? null,
        r.cancelledDate ?? null,
        r.suspendedDate ?? null,
        r.fileDate ?? null,
        r.nature ?? null,
        r.category ?? null,
        r.pincode ?? null,
        now,
        now,
      ]);
    } else if (type === "gst") {
      tableName = "gst_basics";
      columns = [
        "gstin",
        "registration_date",
        "pan",
        "mobile",
        "email",
        "legal_name",
        "trade_name",
        "business_constitution",
        "pincode",
        "address",
        "created_at",
        "updated_at",
      ];
      excludeFromUpdate = ["gstin"];
      valueRows = records.map((r) => [
        r.gstin ?? null,
        r.registrationDate ?? null,
        r.pan ?? null,
        r.mobile ?? null,
        r.email ?? null,
        r.legalName ?? null,
        r.tradeName ?? null,
        r.businessConstitution ?? null,
        r.pincode ?? null,
        r.address ?? null,
        now,
        now,
      ]);
    }

    // Chunk and execute batches
    const valueChunks = chunkArray(valueRows, BATCH_SIZE);
    const recordChunks = chunkArray(records, BATCH_SIZE);
    for (let i = 0; i < valueChunks.length; i++) {
      const chunk = valueChunks[i];
      const recordChunk = recordChunks[i] || [];
      const sql = `
        INSERT IGNORE INTO ${tableName} (${columns
        .map((c) => `\`${c}\``)
        .join(",")})
        VALUES ${chunk.map((v) => `(${v.map(escape).join(",")})`).join(",")}
        ON DUPLICATE KEY UPDATE ${columns
          .filter((col) => !excludeFromUpdate.includes(col))
          .map((col) => `\`${col}\`=VALUES(\`${col}\`)`)
          .join(", ")}
      `;
      await prisma.$queryRaw(Prisma.sql([sql]));

      // If gst, insert associated business natures for this chunk
      if (type === "gst") {
        // build rows: [gstin, business_nature, created_at]
        const businessRows: any[][] = [];
        for (const r of recordChunk) {
          const natures: string[] = Array.isArray(r.businessNatures)
            ? r.businessNatures
            : [];
          for (const b of natures) {
            if (r.gstin && b) businessRows.push([r.gstin, b, now]);
          }
        }
        if (businessRows.length > 0) {
          // insert in smaller batches to avoid huge queries
          const bizChunks = chunkArray(businessRows, BATCH_SIZE);
          for (const bizChunk of bizChunks) {
            const bizSql = `
              INSERT IGNORE INTO gst_business_natures (\`gstin\`, \`business_nature\`, \`created_at\`)
              VALUES ${bizChunk
                .map((v) => `(${v.map(escape).join(",")})`)
                .join(",")}
              ON DUPLICATE KEY UPDATE \`gstin\`=VALUES(\`gstin\`), \`business_nature\`=VALUES(\`business_nature\`)
            `;
            await prisma.$queryRaw(Prisma.sql([bizSql]));
          }
        }
      }

      processed += chunk.length;
    }

    return processed;
  }

  // If gst via prisma fallback, insert business natures as well
  if (type === "gst") {
    const now = new Date();
    const businessData: any[] = [];
    for (const r of records) {
      const natures: string[] = Array.isArray(r.businessNatures)
        ? r.businessNatures
        : [];
      for (const b of natures) {
        if (r.gstin && b)
          businessData.push({
            gstin: r.gstin,
            businessNature: b,
            createdAt: now,
          });
      }
    }
    if (businessData.length > 0) {
      // createMany supports skipDuplicates on mysql
      await prisma.gstBusinessNature.createMany({
        data: businessData,
        skipDuplicates: true,
      });
    }
  }

  // fallback to prisma createMany for other cases
  const result = await model.createMany({
    data: records,
    skipDuplicates: true,
  });
  return result.count;
}

// Process and insert records by type (validate + transform + insert)
export async function processAndInsertRecordsByType(
  type: RecordType,
  records: any[]
): Promise<number> {
  const validatorFn = validatorMap[type];
  const transformFn = transformMap[type];
  if (!validatorFn || !transformFn) throw new Error("Unsupported record type");
  // Filter records by mandatory fields
  const validRecords = validatorFn(records);
  // Transform records
  const transformed = transformFn(validRecords);
  // Insert records
  return await insertRecordsByType(type, transformed);
}
