import fs from "fs";
import path from "path";

const API_DIR = path.join(process.cwd(), "src/app/api");

// In folders ko bilkul touch nahi karna
const IGNORE_FOLDERS = ["auth", "webhook", "v1", "upload", "health", "public"];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_FOLDERS.includes(file)) {
        processDirectory(fullPath);
      }
    } else if (file === "route.ts" || file === "route.js") {
      patchRouteFile(fullPath);
    }
  }
}

function patchRouteFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Agar pehle se getTenantContext laga hai to skip karo
  if (content.includes("getTenantContext")) {
    console.log(`⏩ Already patched: ${filePath}`);
    return;
  }

  console.log(`🔍 Checking: ${filePath}`);

  // Backup create karo
  fs.writeFileSync(`${filePath}.bak`, content);

  // Add helper import if missing
  if (!content.includes('from "@/lib/tenant"')) {
    content = `import { getTenantContext } from "@/lib/tenant";\n` + content;
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Prepped: ${filePath}`);
}

console.log("🚀 Scanning API routes for multi-tenant isolation...");
processDirectory(API_DIR);
console.log("✨ Done!");
