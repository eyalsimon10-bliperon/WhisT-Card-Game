import fs from "fs";
import path from "path";

const nextDir = path.join(process.cwd(), ".next");

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next cache");
} catch (error) {
  console.warn("Could not fully remove .next:", error.message);
  process.exitCode = 0;
}
