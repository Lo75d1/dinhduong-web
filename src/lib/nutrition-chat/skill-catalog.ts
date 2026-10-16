import "server-only";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {NutritionProtocolError} from "./protocol";

type Resource={uri:string;mimeType:string;text:string};
type Skill={uri:string;frontmatter:Record<string,string>;resources:{uri:string;digest:string}[]};
/** Only the immutable public package manifest is read. A request URI is never a file path. */
export async function nutritionSkillCatalog(method:string,params:Record<string,unknown>){
 const data=JSON.parse(await readFile(join(process.cwd(),"public/nutrition-chat/mcp-skills.json"),"utf8")) as {skills:Skill[];resources:Record<string,Resource>};
 if(method==="skills/list"){if(params.cursor!==undefined)throw new NutritionProtocolError(-32602,"Unknown skill cursor");return {skills:data.skills};}
 if(method==="resources/list")return {resources:Object.values(data.resources).map(resource=>({uri:resource.uri,name:resource.uri.split("/").at(-1),mimeType:resource.mimeType}))};
 if(typeof params.uri!=="string"||params.uri.length>2083)throw new NutritionProtocolError(-32602,"Invalid skill resource URI");
 if(method==="skills/get"){const skill=data.skills.find(skill=>skill.uri===params.uri);if(!skill)throw new NutritionProtocolError(-32602,"Unknown skill URI",404);return {skill};}
 const resource=Object.hasOwn(data.resources,params.uri)?data.resources[params.uri]:undefined;
 if(!resource)throw new NutritionProtocolError(-32602,"Unknown skill resource URI",404);
 return {contents:[resource]};
}
