import fs from "fs";
import XLSX from "xlsx";
import moment from "moment";
import prisma from "../db/index.js";

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
    const fileContent = fs.readFileSync(file.path, "utf8");
    // TODO: Add CSV parsing logic here if needed
    // For now, just return empty array
    records = [];
  } else {
    throw new Error("Unsupported file type");
  }
  return records;
}

// Helper function to parse date strings using moment
function parseDate(dateStr: string | number | undefined): Date | undefined {
  if (!dateStr) return undefined;

  // Handle DD/MM/YYYY format
  if (typeof dateStr === "string" && dateStr.includes("/")) {
    const m = moment(dateStr, "DD/MM/YYYY", true);
    return m.isValid() ? m.toDate() : undefined;
  }

  // Handle YYYY-MM-DD format
  if (typeof dateStr === "string" && dateStr.includes("-")) {
    const m = moment(dateStr, "YYYY-MM-DD", true);
    return m.isValid() ? m.toDate() : undefined;
  }

  // Handle Excel date numbers
  if (typeof dateStr === "number") {
    // Excel dates: days since 1899-12-30
    const m = moment("1899-12-30").add(dateStr, "days");
    return m.isValid() ? m.toDate() : undefined;
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
  mca: ["CIN"],
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
