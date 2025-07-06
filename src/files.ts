import { readFileSync, writeFileSync } from "node:fs";
import { minTime, time } from "./conf";

export const appendDataFile = async (
  filePath: string,
  appendData: any[] = []
) => {
  let fileData = [];
  try {
    const raw = readFileSync(filePath, "utf8");
    fileData = JSON.parse(raw);
  } catch (e: any) {
    if (e.code !== "ENOENT") throw e;
  }

  const jsonArray =
    "[\n" +
    appendData
      .map((d) => Object.assign({ time }, d))
      .concat(fileData.filter((d: any) => d.time >= minTime))
      .map((item) => "  " + JSON.stringify(item))
      .join(",\n") +
    "\n]";

  writeFileSync(filePath, jsonArray);
};
