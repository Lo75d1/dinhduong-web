import assert from "node:assert/strict";
import fs from "node:fs/promises";
import JSZip from "jszip";
import {NUTRITION_TOOLS,NUTRITION_WORKFLOW} from "../src/lib/nutrition-chat/tools";
import {nutritionStartMessage,nutritionStartGuide} from "../src/lib/nutrition-chat/start-guide";
import {nutritionMcpOutput} from "../src/lib/nutrition-chat/mcp-output";
import {createHash} from "node:crypto";

async function main(){let checks=0;const check=(v:unknown)=>{assert.ok(v);checks++;};
 check(Object.keys(NUTRITION_WORKFLOW.toolGuide).length===NUTRITION_TOOLS.length);
 for(const tool of NUTRITION_TOOLS){const guide=NUTRITION_WORKFLOW.toolGuide[tool.name];check(guide.input&&guide.returns&&guide.when&&guide.next);check(tool.description.includes(guide.returns));}
 const response=nutritionMcpOutput("get_workflow",NUTRITION_WORKFLOW);check(JSON.parse(response.text).persistence.default==="none");
 const start=nutritionStartMessage("https://dinhduong2598.food");check(start.includes("không lưu thực đơn vào tài khoản"));check(!start.includes("Tôi muốn xem kết quả bằng link bản riêng"));check(start.includes("saveToAccount=false"));
 const text=nutritionStartGuide("https://dinhduong2598.food");check(text.includes(`có ${NUTRITION_TOOLS.length} công cụ`));check(!text.includes("13 công cụ"));
 const zip=await JSZip.loadAsync(await fs.readFile("public/nutrition-chat/dinh-duong-2598-plugin.zip"));
 check(zip.file("README.md"));const reference=await zip.file("skills/dinh-duong-2598/references/cong-cu.md")!.async("string");for(const tool of NUTRITION_TOOLS)check(reference.includes(`## ${tool.name} —`));
 check(reference.includes("MCP"));check(reference.includes("confirmationToken"));check(reference.includes("Chỉ tính, không lưu"));check(reference.includes("429 hoặc503"));
 const skill=await zip.file("skills/dinh-duong-2598/SKILL.md")!.async("string");check(skill.includes("references/cong-cu.md"));
 const manifest=JSON.parse(await zip.file("plugin.json")!.async("string"));check(zip.file(manifest.extensions["com.openai"].onboardingSkill.replace(/^\.\//,"")));
 const catalog=JSON.parse(await fs.readFile("public/nutrition-chat/mcp-skills.json","utf8"));check(catalog.skills.length===2);
 for(const entry of catalog.skills){check(entry.uri.includes(`/${entry.frontmatter.name}/SKILL.md`));for(const item of entry.resources){const resource=catalog.resources[item.uri];check(Boolean(resource));check(item.digest===`sha256:${createHash("sha256").update(resource.text,"utf8").digest("hex")}`);}}
 console.log(`Tool guide/package/no-save routing: ${checks} checks passed; tool list ${JSON.stringify(NUTRITION_TOOLS).length} characters, workflow ${response.text.length}.`);
}main().catch(e=>{console.error(e);process.exitCode=1});
