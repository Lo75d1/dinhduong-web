import "dotenv/config";
import {prisma} from "../src/lib/prisma";
import {cleanupNutritionOAuth} from "../src/lib/nutrition-chat/maintenance";
import {cleanupNutritionDownloads} from "../src/lib/nutrition-chat/download-store";
async function main(){
  if(!process.argv.includes("--apply")){console.log("Dry run: khong truy cap DB/tep. Sau merge/migrate: NUTRITION_MAINTENANCE_ENABLED=1 npx tsx scripts/cleanup-nutrition-chat.ts --apply --batches=10");return;}
  if(process.env.NUTRITION_MAINTENANCE_ENABLED!=="1")throw new Error("Maintenance chua duoc bat.");
  const arg=process.argv.find(value=>value.startsWith("--batches=")),batches=arg?Number(arg.slice(10)):1;
  if(!Number.isInteger(batches) || batches<1 || batches>20)throw new Error("So batch khong hop le.");
  const totals={codes:0,tokens:0,windows:0,clients:0};
  try{
    const downloads=await cleanupNutritionDownloads();
    for(let i=0;i<batches;i++){const counts=await cleanupNutritionOAuth(200);for(const key of Object.keys(totals) as (keyof typeof totals)[])totals[key]+=counts[key];if(Object.values(counts).every(value=>value===0))break;}
    console.log(JSON.stringify({downloads,expiredOAuthRecordsDeleted:totals}));
  }finally{await prisma.$disconnect();}
}
main().catch(()=>{console.error("Maintenance that bai; kiem tra migration/cau hinh, khong in bi mat DB.");process.exitCode=1;});
