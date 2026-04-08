import { collectOptsData } from "./opts";

collectOptsData().catch((err) => {
  console.error("Option collection failed:", err);
  process.exitCode = 1;
});
