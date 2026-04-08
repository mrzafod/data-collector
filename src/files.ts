import { appendFileSync, mkdirSync } from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

export const appendCsvFile = async (
  fileRelativePath: string,
  appendData: Array<Array<string | number>> = []
) => {
  if (!appendData.length) return;

  const filePath = path.join(PROJECT_ROOT, fileRelativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });

  const payload = `${appendData
    .map((row) => row.map((value) => String(value)).join(";"))
    .join("\n")}\n`;

  appendFileSync(filePath, payload);
};
