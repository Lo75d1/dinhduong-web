import {spawnSync} from "node:child_process";
const files=["test-nutrition-chat-core.ts","test-nutrition-chat-report.ts","test-nutrition-oauth-security.ts","test-nutrition-oauth-db.ts","test-nutrition-storage.ts","test-nutrition-chat-http.ts","test-personal-library.ts","test-nutrition-chat-workbook.ts","test-nutrition-complete-report.ts","test-nutrition-review.ts","test-nutrition-clinical.ts","test-nutrition-tool-guide.ts"];
for(const file of files){
  const test=spawnSync(process.execPath,["--import","tsx",`scripts/${file}`],{stdio:"inherit",env:process.env});
  if(test.error || test.status!==0){console.error(`Failed: ${file}`);process.exit(test.status??1);}
}
