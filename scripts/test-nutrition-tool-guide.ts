import assert from "node:assert/strict";
import fs from "node:fs/promises";
import JSZip from "jszip";
import {NUTRITION_TOOLS,NUTRITION_WORKFLOW} from "../src/lib/nutrition-chat/tools";
import {nutritionDoctorStartMessage,nutritionStartLinks,nutritionStartMessage,nutritionStartGuide} from "../src/lib/nutrition-chat/start-guide";
import {nutritionMcpOutput} from "../src/lib/nutrition-chat/mcp-output";
import {createHash} from "node:crypto";

async function main(){let checks=0;const check=(v:unknown)=>{assert.ok(v);checks++;};
 check(Object.keys(NUTRITION_WORKFLOW.toolGuide).length===NUTRITION_TOOLS.length);
 for(const tool of NUTRITION_TOOLS){const guide=NUTRITION_WORKFLOW.toolGuide[tool.name];check(guide.input&&guide.returns&&guide.when&&guide.next);check(tool.description.includes(guide.returns));}
 const response=nutritionMcpOutput("get_workflow",NUTRITION_WORKFLOW);check(JSON.parse(response.text).persistence.default==="temporary-web");check(NUTRITION_WORKFLOW.persistence.accountDefault==="none");check(NUTRITION_WORKFLOW.menuGuidance.includes("nước chấm"));check(NUTRITION_WORKFLOW.webEditing.accountRequired===false);
 const start=nutritionStartMessage("https://dinhduong2598.food");check(start.includes("không lưu thực đơn vào tài khoản"));check(!start.includes("Tôi muốn xem kết quả bằng link bản riêng"));check(start.includes("saveToAccount=false"));
 const text=nutritionStartGuide("https://dinhduong2598.food");check(text.includes(`có ${NUTRITION_TOOLS.length} công cụ`));check(!text.includes("13 công cụ"));
 const doctor=nutritionDoctorStartMessage("https://example.test");check(doctor.includes(nutritionStartLinks("https://example.test").text));check(!doctor.includes("accessToken"));check(!doctor.includes("confirmationToken"));check(doctor.includes("không bắt tôi tạo tài khoản"));
 check(NUTRITION_WORKFLOW.accountUse.loginPath.startsWith("/dang-nhap?next="));check(NUTRITION_WORKFLOW.accountUse.steps.some(step=>step.includes("Không tái dùng confirmationToken")));
 check(text.includes("Đăng ký mới"));check(text.includes("Đăng nhập website không tự gắn tài khoản với plugin"));check(text.includes("không bắt học tên API"));
 const zip=await JSZip.loadAsync(await fs.readFile("public/nutrition-chat/dinh-duong-2598-plugin.zip"));
 check(zip.file("README.md"));const reference=await zip.file("skills/dinh-duong-2598/references/cong-cu.md")!.async("string");for(const tool of NUTRITION_TOOLS)check(reference.includes(`## ${tool.name} —`));
 check(reference.includes("MCP"));check(reference.includes("confirmationToken"));check(reference.includes("Chỉ tính, không lưu"));check(reference.includes("429 hoặc503"));
 const skill=await zip.file("skills/dinh-duong-2598/SKILL.md")!.async("string");check(skill.includes("references/cong-cu.md"));
 const manifest=JSON.parse(await zip.file("plugin.json")!.async("string"));check(zip.file(manifest.extensions["com.openai"].onboardingSkill.replace(/^\.\//,"")));
 const catalog=JSON.parse(await fs.readFile("public/nutrition-chat/mcp-skills.json","utf8"));check(catalog.skills.length===2);
 for(const entry of catalog.skills){check(entry.uri.includes(`/${entry.frontmatter.name}/SKILL.md`));for(const item of entry.resources){const resource=catalog.resources[item.uri];check(Boolean(resource));check(item.digest===`sha256:${createHash("sha256").update(resource.text,"utf8").digest("hex")}`);}}
 console.log(`Tool guide/package/no-save routing: ${checks} checks passed; tool list ${JSON.stringify(NUTRITION_TOOLS).length} characters, workflow ${response.text.length}.`);
}main().catch(e=>{console.error(e);process.exitCode=1});
