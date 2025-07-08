import { readFileSync, writeFileSync } from "node:fs";
import { minTime, time } from "./conf";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

export const appendDataFile = async (
  fileRelativePath: string,
  appendData: any[] = []
) => {
  const filePath = path.join(PROJECT_ROOT, fileRelativePath);
  let fileData = [];
  try {
    const raw = readFileSync(filePath, "utf8");
    fileData = JSON.parse(raw);
  } catch (error) {
    console.log(error);
  }

  console.log(fileRelativePath, new Date(time), new Date(minTime))

  const jsonArray =
    "[\n" +
    appendData
      .map((d) => Object.assign({ time }, d))
      .concat(fileData.filter((d: any) => d.time >= minTime && d.time < time))
      .map((item) => "  " + JSON.stringify(item))
      .join(",\n") +
    "\n]";

  writeFileSync(filePath, jsonArray);
};
