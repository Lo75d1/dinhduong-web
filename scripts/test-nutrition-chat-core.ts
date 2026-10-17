import assert from "node:assert/strict";
import { parseMenuInput, NutritionInputError, MENU_INPUT_SCHEMA } from "../src/lib/nutrition-chat/validation";
import { nutritionErrorGuidance, nutritionResponseGuidance } from "../src/lib/nutrition-chat/response-guidance";
import { resolveMenu, assertMenuComplete, nutritionDigest, sanitizeNutritionFood } from "../src/lib/nutrition-chat/core";
import { createNutritionTicket, verifyNutritionTicket } from "../src/lib/nutrition-chat/approval";
import { parseNutritionRpc, nutritionRpcResult, NutritionProtocolError } from "../src/lib/nutrition-chat/protocol";
import type { NutritionFood } from "../src/lib/nutrition-chat/contracts";
const source={kind:"catalog" as const,label:"Fixture",confirmed:true};
const foods:NutritionFood[]=[{id:"food-a",name:"A",unit:"g",source,wastePercent:20,foodGroup:"Rau",nutrients:{energyKcal:100,proteinG:10,lipidG:2,glucidG:20,calciumMg:50}},{id:"food-b",name:"B",unit:"g",source,wastePercent:null,foodGroup:null,nutrients:{energyKcal:null,proteinG:0,lipidG:null,glucidG:10,calciumMg:null}},{id:"milk",name:"Sữa",unit:"ml",source,wastePercent:0,foodGroup:"Sữa",nutrients:{energyKcal:60,proteinG:3,lipidG:3,glucidG:5}}];
const row={id:"r1",meal:"Sáng",dish:"Món",foodId:"food-a",quantity:100,unit:"g",servings:1,basis:"edible",recipeSource:{kind:"user",label:"Người dùng cung cấp"}};
const base={title:"Fixture",mode:"menu",days:[{id:"d1",label:"Ngày 1",date:"2026-10-14",rows:[row]}],comparison:{mode:"none"},fields:["energyKcal","proteinG","calciumMg"]};
let checks=0;
function equal(actual:unknown,expected:unknown){assert.deepEqual(actual,expected);checks++;}
function bad(value:unknown){assert.throws(()=>parseMenuInput(value),NutritionInputError);checks++;}
const completeProfile={age:"45",ageUnit:"tuoi",gender:"Nữ",weight:"60",height:"170",activityLevel:"light",physiology:"normal"};
equal(MENU_INPUT_SCHEMA.properties.profile.required,["age","ageUnit","gender","activityLevel","physiology"]);
for(const field of MENU_INPUT_SCHEMA.properties.profile.required){const missing:Record<string,unknown>={...completeProfile};delete missing[field];assert.throws(()=>parseMenuInput({...base,profile:missing}),(error:unknown)=>error instanceof NutritionInputError && error.status===422 && error.field===`profile.${field}` && error.message.includes("không tự điền"));checks++;equal(nutritionErrorGuidance(422,`profile.${field}`).stage,"needs_input");}
for(const invalidProfile of [{...completeProfile,age:45},{...completeProfile,gender:"unknown"},{...completeProfile,age:"NaN"},{...completeProfile,weight:"-1"}])bad({...base,profile:invalidProfile});
equal(parseMenuInput({...base,profile:completeProfile}).profile?.age,"45");
equal(parseMenuInput(base).profile,undefined);
equal(parseMenuInput({...base,comparison:{mode:"manual",targets:[{key:"energyKcal",value:1800,source:"Fixture target"}]}}).profile,undefined);
assert.throws(()=>parseMenuInput({...base,comparison:{mode:"profile"}}),(error:unknown)=>error instanceof NutritionInputError && error.field==="profile" && error.status===422);checks++;
const parsed=parseMenuInput(base),menu=resolveMenu(parsed,foods);
equal(menu.days[0].rows[0].food.nutrientBasis?.amount,100);
equal(menu.days[0].rows[0].food.nutrientBasis?.unit,"g");
const vddFood = {...foods[0], source:{...source,label:"VDD"}, foodType:"MA"};
const vddLookup = sanitizeNutritionFood(vddFood), vddMenu = resolveMenu(parsed,[vddFood]);
equal(vddLookup.nutrientBasis?.status,"unverified");equal(vddLookup.nutrientBasis?.amount,null);
equal(vddLookup.nutrients.energyKcal,null);equal(vddLookup.unverifiedSourceNutrients?.energyKcal,100);
equal(sanitizeNutritionFood(vddLookup).unverifiedSourceNutrients,vddLookup.unverifiedSourceNutrients);
equal(vddFood.nutrients.energyKcal,100);
equal(vddMenu.totals.energyKcal.value,null);equal(vddMenu.totals.energyKcal.incomplete,true);
equal(vddMenu.missingInputs[0].field,"nutrientBasis");
assert.throws(()=>assertMenuComplete(vddMenu),error=>error instanceof NutritionInputError && error.status===422);checks++;
for(const [name,data] of [["get_food",vddLookup],["search_foods",{items:[vddLookup]}],["prepare_menu",{preview:vddMenu}]] as const){const guide=nutritionResponseGuidance(name,data);equal(guide.stage,"source_basis_unverified");equal(guide.nextTools.includes("search_dishes"),true);equal(guide.instruction.includes("RNI"),true);}
const vddZero = resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,quantity:0}]}]}),[vddFood]);
equal(vddZero.totals.energyKcal.value,0);equal(vddZero.missingInputs,[]);
equal(sanitizeNutritionFood({...vddFood,source:{...source,label:"RNI"}}).nutrientBasis?.status,"per100");
equal(sanitizeNutritionFood({...vddFood,foodType:"TS"}).nutrientBasis?.status,"per100");
const spoofed = {...vddFood,nutrientBasis:{status:"per100" as const,amount:100 as const,unit:"g" as const,note:"Client claims 100g"}};
equal(sanitizeNutritionFood(spoofed).nutrientBasis?.status,"unverified");
equal(menu.totals.energyKcal.value,100);equal(menu.days[0].rows[0].rawGrams,125);equal(menu.targets,[]);equal(menu.analysis.periodEnergyStatus,"unknown");assertMenuComplete(menu);checks++;
equal(nutritionDigest({a:1,b:2}),nutritionDigest({b:2,a:1}));
const mixed=parseMenuInput({...base,days:[{...base.days[0],rows:[row,{...row,id:"r2",foodId:"food-b"}]}]});
const partial=resolveMenu(mixed,foods);equal(partial.totals.energyKcal.value,100);equal(partial.totals.energyKcal.incomplete,true);equal(partial.totals.energyKcal.missingRows,["r2"]);equal(partial.totals.proteinG.value,10);equal(partial.totals.proteinG.incomplete,false);
const nulls=resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,foodId:"food-b"}]}]}),foods);equal(nulls.totals.energyKcal.value,null);equal(nulls.totals.proteinG.value,0);
const zero=resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,foodId:"food-b",quantity:0}]}]}),foods);equal(zero.totals.energyKcal.value,0);equal(zero.totals.energyKcal.incomplete,false);
const rawZero=resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,foodId:"food-b",quantity:0,basis:"raw",unit:"ml"}]}]}),foods);equal(rawZero.totals.energyKcal.value,0);equal(rawZero.missingInputs,[]);equal(rawZero.days[0].rows[0].rawGrams,0);
const raw=resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,basis:"raw",quantity:100}]}]}),foods);equal(raw.days[0].rows[0].referenceAmount,80);equal(raw.totals.energyKcal.value,80);
const rawMissing=resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,basis:"raw",foodId:"food-b"}]}]}),foods);equal(rawMissing.days[0].rows[0].referenceAmount,null);assert.throws(()=>assertMenuComplete(rawMissing),NutritionInputError);checks++;
const cooked=resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,basis:"cooked",servings:2,conversionFactor:0.4,conversionSource:"Hệ số người dùng xác nhận"}]}]}),foods);equal(cooked.totals.energyKcal.value,80);
const ml=resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,foodId:"milk",quantity:200,unit:"ml"}]}]}),foods);equal(ml.totals.energyKcal.value,120);equal(ml.days[0].rows[0].edibleGrams,null);equal(ml.analysis.foodGroups,[]);
equal(ml.days[0].rows[0].food.nutrientBasis?.unit,"ml");equal(ml.days[0].rows[0].food.nutrientBasis?.amount,100);
const density=resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,foodId:"milk",quantity:206,unit:"g",densityGPerMl:1.03,densitySource:"Nhãn"}]}]}),foods);equal(density.totals.energyKcal.value,120);equal(density.days[0].rows[0].edibleGrams,206);equal(density.analysis.foodGroups[0].edibleGrams,206);
const label={id:"outside",name:"Sản phẩm ngoài kho",source:{kind:"label",label:"Nhãn 50g",confirmed:true},basis:"portion",portionAmount:50,portionUnit:"g",nutrients:{energyKcal:200,proteinG:4}};
const external=resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,foodId:undefined,customFood:label,quantity:25}]}]}),foods);equal(external.totals.energyKcal.value,100);equal(external.totals.proteinG.value,2);
equal(external.days[0].rows[0].food.nutrientBasis?.status,"per100");
const unknown=resolveMenu(parseMenuInput({...base,days:[{...base.days[0],rows:[{...row,foodId:undefined,customFood:{...label,basis:"100g",source:{kind:"unknown",label:"Chưa có nguồn",confirmed:false},nutrients:{}}}]}]}),foods);equal(unknown.totals.energyKcal.value,null);equal(unknown.totals.energyKcal.incomplete,true);assertMenuComplete(unknown);checks++;
const target=resolveMenu(parseMenuInput({...base,comparison:{mode:"manual",targets:[{key:"energyKcal",value:100,source:"Người dùng"},{key:"calciumMg",value:50,source:"Người dùng"}]}}),foods);equal(target.analysis.periodEnergyStatus,"dat");equal(target.analysis.nutrients.find(n=>n.key==="calciumMg")?.status,"dat");equal(target.analysis.nutrients.find(n=>n.key==="calciumMg")?.achievedDays,1);
const emptyDay=resolveMenu(parseMenuInput({...base,days:[...base.days,{id:"empty",label:"Chưa nhập",date:"",rows:[]}]}),foods);equal(emptyDay.analysis.dataDayCount,1);equal(emptyDay.dayTotals[1].totals.energyKcal.value,null);
const suspect=resolveMenu(parsed,[{...foods[0],nutrients:{...foods[0].nutrients,energyKcal:2992,glucidG:669}}]);equal(suspect.totals.energyKcal.value,null);assert.ok(suspect.warnings.length>0);checks++;
bad({...base,isAdmin:true});bad({...base,days:[{...base.days[0],date:"2026-99-99"}]});bad({...base,days:[{...base.days[0],date:"2026-02-30"}]});bad({...base,days:[{...base.days[0],rows:[{...row,quantity:NaN}]}]});bad({...base,days:[{...base.days[0],rows:[{...row,quantity:-1}]}]});bad({...base,days:[{...base.days[0],rows:[{...row,customFood:label}]}]});bad({...base,days:[{...base.days[0],rows:[row,row]}]});bad({...base,comparison:{mode:"profile"}});
bad({...base,days:[{...base.days[0],rows:[{...row,foodId:undefined,customFood:{...label,source:{kind:"unknown",label:"?",confirmed:false}}}]}]});
bad({...base,days:Array.from({length:91},(_,i)=>({...base.days[0],id:String(i),rows:[{...row,id:String(i)}]}))});
bad({...base,days:[{...base.days[0],rows:Array.from({length:101},(_,i)=>({...row,id:`r${i}`,foodId:undefined,customFood:{...label,id:`c${i}`}}))}]});
const identity={userId:"a",clientId:"c",scopes:[]},savedSecret=process.env.APP_SECRET;
process.env.APP_SECRET="isolated-core-test-placeholder-no-production-secret";
try {
  const ticket=createNutritionTicket("confirm",menu.digest,identity);
  verifyNutritionTicket(ticket,"confirm",menu.digest,identity);checks++;
  for(const [token,digest,who] of [[ticket,menu.digest,{...identity,userId:"b"}],[ticket,"changed",identity],[ticket+"tampered",menu.digest,identity]] as const){assert.throws(()=>verifyNutritionTicket(token,"confirm",digest,who),NutritionInputError);checks++;}
  const changed=resolveMenu(parsed,[{...foods[0],nutrients:{...foods[0].nutrients,energyKcal:101}}]);assert.notEqual(changed.digest,menu.digest);checks++;
}finally{if(savedSecret===undefined)delete process.env.APP_SECRET;else process.env.APP_SECRET=savedSecret;}
const headers=new Headers({Accept:"application/json, text/event-stream","MCP-Protocol-Version":"2026-07-28","Mcp-Method":"tools/call","Mcp-Name":"get_food"});
const rpcBody={jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"get_food",arguments:{id:"a"},_meta:{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{}}}};
const rpc=parseNutritionRpc(rpcBody,headers);equal(rpc.modern,true);equal(nutritionRpcResult(rpc,{tools:[]},true).result.resultType,"complete");
const legacy=parseNutritionRpc({jsonrpc:"2.0",id:"old",method:"initialize",params:{protocolVersion:"2025-11-25"}},new Headers({Accept:"application/json, text/event-stream"}));equal(legacy.modern,false);equal(legacy.version,"2025-03-26");
for(const mutation of [new Headers({...Object.fromEntries(headers),"mcp-name":"wrong"}),new Headers({...Object.fromEntries(headers),"mcp-method":"ping"}),new Headers({...Object.fromEntries(headers),"mcp-protocol-version":"1900-01-01"})]){assert.throws(()=>parseNutritionRpc(rpcBody,mutation),NutritionProtocolError);checks++;}
assert.throws(()=>parseNutritionRpc({...rpcBody,id:null},headers),NutritionProtocolError);checks++;
assert.throws(()=>parseNutritionRpc([rpcBody],headers),NutritionProtocolError);checks++;
const missingMeta=structuredClone(rpcBody) as typeof rpcBody;delete (missingMeta.params._meta as Record<string,unknown>)["io.modelcontextprotocol/clientCapabilities"];
assert.throws(()=>parseNutritionRpc(missingMeta,headers),NutritionProtocolError);checks++;
// This test never imports Prisma or opens a database connection.
console.log(`Nutrition chat core/protocol: ${checks} checks passed.`);
