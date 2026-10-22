import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const playwrightPath=process.env.CLINICAL_PLAYWRIGHT_PATH || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const executablePath=process.env.CLINICAL_CHROMIUM_PATH;
if(!executablePath) throw Error('Set CLINICAL_CHROMIUM_PATH to an installed Chromium executable.');
const {chromium}=await import(playwrightPath);
const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'],headless:true});
const out=path.resolve('docs/design/previews');await mkdir(out,{recursive:true});
const fixture=JSON.parse(await readFile('docs/design/prototypes/clinical-menu-fixture.json','utf8'));
const byId=new Map(fixture.foods.map(food=>[food.id,food]));
const baseline=fixture.content.days[0].meals.flatMap(meal=>meal.groupPortions.flatMap(portion=>portion.dishes.flatMap(dish=>dish.ingredients))).reduce((sum,item)=>sum+item.quantityPerPortion*byId.get(item.foodId).nutrients.energyKcal/100,0);
const riceEnergy=byId.get(fixture.content.days[0].meals[0].groupPortions[0].dishes[0].ingredients[0].foodId).nutrients.energyKcal;
const display=value=>value.toLocaleString('vi-VN',{maximumFractionDigits:1});
const initial=display(baseline), edited50=display(baseline+10*riceEnergy/100), edited55=display(baseline+15*riceEnergy/100);
let checks=0;const errors=[];
function check(value,message){assert.ok(value,message);checks++;}
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(path.join(out,'clinical-menu.html')).href);
 // Named sections are located by their accessible label regardless of HTML role.
 const summaryNode=page.locator('[aria-label="Năng lượng và tỷ lệ P L G"]');
 await page.waitForFunction(value=>document.querySelector('[aria-label="Năng lượng và tỷ lệ P L G"]')?.textContent.includes(value),initial);
 check((await summaryNode.innerText()).includes(initial),'Synthetic menu calculates automatically using public source-linked ingredients');
 check((await page.getByRole('region',{name:'Bữa Sáng'}).innerText()).includes('Cháo bò đậu xanh'),'Meal heading leads into dishes');
 check(await page.locator('[aria-label="Bữa ăn, món ăn và thực phẩm"]').getByText('Gạo tẻ máy',{exact:true}).count()===3,'Ingredients remain directly visible under their dishes');
 check(!await page.getByRole('table').filter({has:page.getByText('Chất đạm (g)',{exact:true})}).isVisible(),'Detailed nutrient table is collapsed initially');
 const details=page.locator('summary').filter({hasText:'Phân tích dinh dưỡng chi tiết'}).first();
 await details.focus();await details.press('Enter');
 check(await page.getByRole('table').filter({has:page.getByText('Chất đạm (g)',{exact:true})}).isVisible(),'Keyboard opens the detailed analysis');
 await details.press('Space');
 check(!await page.getByRole('table').filter({has:page.getByText('Chất đạm (g)',{exact:true})}).isVisible(),'Keyboard closes detail while preserving the main meal view');
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:path.join(out,'clinical-menu-desktop.png'),fullPage:false});
 for(const width of [1440,1024,768,390,360,320]){
  await page.setViewportSize({width,height:1000});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No page-wide horizontal overflow at '+width);
 }
 await page.setViewportSize({width:390,height:1000});
 await page.screenshot({path:path.join(out,'clinical-menu-mobile.png'),fullPage:false});
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Chỉnh khẩu phần',exact:true}).click();
 const quantity=page.locator('input[max="100000"]').first();await quantity.fill('50');
 await page.waitForFunction(value=>document.querySelector('[aria-label="Năng lượng và tỷ lệ P L G"]')?.textContent.includes(value),edited50);
 check((await summaryNode.innerText()).includes('chưa lưu'),'Unsaved live calculation is labelled clearly');
 await page.screenshot({path:path.join(out,'clinical-menu-editing.png'),fullPage:false});
 await quantity.fill('');
 await page.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent.includes('định lượng hợp lệ'));
 check(!(await summaryNode.innerText()).includes(edited50),'Blank quantity never leaves a stale calculated total displayed');
 await quantity.fill('55');
 await page.waitForFunction(value=>document.querySelector('[aria-label="Năng lượng và tỷ lệ P L G"]')?.textContent.includes(value),edited55);
 await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
 check((await page.getByRole('alert').last().innerText()).includes('Không lưu hay duyệt'),'Preview explicitly refuses real writes and approvals');
 check(errors.length===0,'No browser JavaScript errors');
 console.log(JSON.stringify({checks,browser:await browser.version(),viewportChecks:[1440,1024,768,390,360,320],errors,screenshots:3,scope:'Real Chromium with synthetic UI fixture with public food source data and in-browser transport, no production writes.'}));
} finally {await browser.close();}
