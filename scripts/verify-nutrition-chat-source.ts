import "dotenv/config";
import {prisma} from "../src/lib/prisma";
async function main(){
  const timer=setTimeout(()=>{console.error("Read-only source check timed out; no migration or data writes performed.");process.exit(1);},30_000);
  try{
    const totals=await prisma.$queryRaw<Array<{foods:bigint;dishes:bigint;ingredients:bigint;recommendations:bigint;aliases:bigint;unsupportedUnits:bigint;missingProtein:bigint;missingLipid:bigint;missingGlucid:bigint;missingWaste:bigint;suspiciousMajor:bigint}>>`
      SELECT (SELECT COUNT(*) FROM "foods") AS foods,
      (SELECT COUNT(*) FROM "dishes") AS dishes,
      (SELECT COUNT(*) FROM "dish_ingredients") AS ingredients,
      (SELECT COUNT(*) FROM "nutrition_recommendations") AS recommendations,
      (SELECT COUNT(*) FROM "food_aliases") AS aliases,
      (SELECT COUNT(*) FROM "foods" WHERE "unit" IS NULL OR "unit" NOT IN ('g','ml')) AS "unsupportedUnits",
      (SELECT COUNT(*) FROM "foods" WHERE "proteinG" IS NULL) AS "missingProtein",
      (SELECT COUNT(*) FROM "foods" WHERE "lipidG" IS NULL) AS "missingLipid",
      (SELECT COUNT(*) FROM "foods" WHERE "glucidG" IS NULL) AS "missingGlucid",
      (SELECT COUNT(*) FROM "foods" WHERE "wastePercent" IS NULL) AS "missingWaste",
      (SELECT COUNT(*) FROM "foods" WHERE "unit"='g' AND ("energyKcal">1000 OR "proteinG">100 OR "lipidG">100 OR "glucidG">100)) AS "suspiciousMajor"`;
    console.log(JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,...Object.fromEntries(Object.entries(totals[0]).map(([key,value])=>[key,Number(value)]))},null,2));
  }finally{clearTimeout(timer);await prisma.$disconnect();}
}
main().catch(error=>{console.error(JSON.stringify({readOnly:true,status:"not_verified",code:error && typeof error==="object" && "code" in error && /^[A-Za-z0-9_-]{1,20}$/.test(String(error.code))?String(error.code):"connection_or_schema_error"}));process.exitCode=1;});
