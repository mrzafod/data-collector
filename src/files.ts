import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { minTime, time } from "./conf";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

const splitRows = (raw: string): string[] =>
  raw.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);

const parseRowTime = (row: string): number => Number(row.split(";")[1]);

export const appendCsvFile = async (
  fileRelativePath: string,
  appendData: Array<Array<string | number>> = []
) => {
  const filePath = path.join(PROJECT_ROOT, fileRelativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });

  let fileData: string[] = [];
  try {
    const raw = readFileSync(filePath, "utf8");
    fileData = splitRows(raw);
  } catch {
    fileData = [];
  }

  const incomingRows = appendData.map((row) =>
    row.map((value) => String(value)).join(";")
  );

  const existingRows = fileData.filter((row) => {
    const rowTime = parseRowTime(row);
    return Number.isFinite(rowTime) && rowTime >= minTime && rowTime < time;
  });

  const outputRows = [...incomingRows, ...existingRows];
  writeFileSync(
    filePath,
    outputRows.length ? `${outputRows.join("\n")}\n` : ""
  );
};
