import { parseNutritionRpc, nutritionRpcResult, NutritionProtocolError, NUTRITION_MCP_VERSIONS, NUTRITION_SERVER_INFO, type NutritionRpc } from "@/lib/nutrition-chat/protocol";
import { getNutritionIdentity, nutritionJson, nutritionErrorResponse, validateNutritionOrigin, readNutritionJson, NutritionSecurityError, nutritionAuthenticateChallenge, enforceNutritionRateLimit, nutritionAnonymousKey } from "@/lib/nutrition-chat/security";
import { NUTRITION_TOOLS, NUTRITION_WORKFLOW, nutritionToolScope } from "@/lib/nutrition-chat/tools";
import { executeNutritionTool } from "@/lib/nutrition-chat/operations";
import { validateOperationObject } from "@/lib/nutrition-chat/service";
import { NutritionInputError, NUTRITION_LIMITS } from "@/lib/nutrition-chat/validation";
import {nutritionMcpOutput} from "@/lib/nutrition-chat/mcp-output";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  let rpc:NutritionRpc|undefined;
  let requestId:string|number|undefined;
  try {
    validateNutritionOrigin(request);
    const body=await readNutritionJson(request,NUTRITION_LIMITS.jsonBytes);
    if(body && typeof body==="object" && !Array.isArray(body) && "id" in body && (typeof body.id==="string" || typeof body.id==="number" && Number.isSafeInteger(body.id)))requestId=body.id;
    rpc=parseNutritionRpc(body,request.headers);
    const name=typeof rpc.params.name==="string"?rpc.params.name:"";
    // Discovery/schema and the public guide contain no account or catalogue data.
    // They must load before ChatGPT can discover which tool needs OAuth.
    const hasAuthorization=request.headers.has("authorization");
    if(!hasAuthorization){
      await enforceNutritionRateLimit("nutrition-discovery:global",{limit:600,windowSeconds:60});
      await enforceNutritionRateLimit(`nutrition-discovery:anonymous:${nutritionAnonymousKey(request)}`,{limit:60,windowSeconds:60});
    }
    const publicRequest=["initialize","server/discover","tools/list","ping","notifications/initialized"].includes(rpc.method) || rpc.method==="tools/call" && name==="get_workflow";
    const identity=hasAuthorization || !publicRequest?await getNutritionIdentity(request,rpc.method==="tools/call"?nutritionToolScope(name)??"nutrition:read":"nutrition:read"):undefined;
    if(rpc.id===undefined) {
      if(!rpc.modern && rpc.method==="notifications/initialized")return new Response(null,{status:202,headers:{"Cache-Control":"no-store"}});
      throw new NutritionProtocolError(-32601,"Notification not supported",404);
    }
    if(rpc.method==="initialize" && !rpc.modern) {
      validateOperationObject(rpc.params,["protocolVersion","capabilities","clientInfo","_meta"],["protocolVersion","capabilities","clientInfo"]);
      const version=NUTRITION_MCP_VERSIONS.slice(1).includes(rpc.params.protocolVersion as "2025-11-25")?rpc.params.protocolVersion:"2025-11-25";
      return nutritionJson(nutritionRpcResult(rpc,{protocolVersion:version,capabilities:{tools:{listChanged:false}},serverInfo:NUTRITION_SERVER_INFO,instructions:NUTRITION_WORKFLOW.start+" "+NUTRITION_WORKFLOW.steps.join(" ")}));
    }
    if(rpc.method==="server/discover" && rpc.modern){validateOperationObject(rpc.params,["_meta"]);return nutritionJson(nutritionRpcResult(rpc,{supportedVersions:NUTRITION_MCP_VERSIONS,capabilities:{tools:{}},instructions:NUTRITION_WORKFLOW.start+" "+NUTRITION_WORKFLOW.steps.join(" ")},true));}
    if(rpc.method==="ping"){validateOperationObject(rpc.params,["_meta"]);return nutritionJson(nutritionRpcResult(rpc,{}));}
    if(rpc.method==="tools/list"){validateOperationObject(rpc.params,["cursor","_meta"]);if(rpc.params.cursor!==undefined)throw new NutritionProtocolError(-32602,"Unknown cursor");return nutritionJson(nutritionRpcResult(rpc,{tools:NUTRITION_TOOLS},true));}
    if(rpc.method!=="tools/call")throw new NutritionProtocolError(-32601,"Method not found",404);
    validateOperationObject(rpc.params,["name","arguments","_meta"],["name"]);
    if(!nutritionToolScope(name))throw new NutritionProtocolError(-32602,"Unknown tool");
    try {
      let result:unknown;
      if(name==="get_workflow" && !identity){validateOperationObject(rpc.params.arguments??{},[]);result=NUTRITION_WORKFLOW;}
      else {
        if(!identity)throw new NutritionSecurityError("invalid_token",401,"Kết nối tài khoản để dùng công cụ này.",nutritionToolScope(name));
        result=await executeNutritionTool(name,rpc.params.arguments??{},identity);
      }
      const output=nutritionMcpOutput(name,result);
      return nutritionJson(nutritionRpcResult(rpc,{content:[{type:"text",text:output.text}],...(rpc.version!=="2025-03-26" && output.includeStructured?{structuredContent:output.data}:{})}));
    }catch(error) {
      if(!(error instanceof NutritionInputError))throw error;
      return nutritionJson(nutritionRpcResult(rpc,{isError:true,content:[{type:"text",text:JSON.stringify({error:"invalid_input",message:error.message,field:error.field,status:error.status})}]}));
    }
  }catch(error) {
    if(error instanceof NutritionSecurityError && rpc?.method==="tools/call" && rpc.id!==undefined && (error.code==="invalid_token" || error.code==="insufficient_scope")){
      const scope=error.scope??nutritionToolScope(String(rpc.params.name))??"nutrition:read";
      const challenge=`${nutritionAuthenticateChallenge(scope,error.code)}, error_description="Connect your Dinh duong 2598 account to continue"`;
      return nutritionJson(nutritionRpcResult(rpc,{isError:true,content:[{type:"text",text:JSON.stringify({error:error.code,error_description:error.description})}],_meta:{"mcp/www_authenticate":[challenge]}}),error.status,{"WWW-Authenticate":challenge});
    }
    if(error instanceof NutritionSecurityError && error.code==="invalid_request" && error.status===400 && !rpc)return nutritionJson({jsonrpc:"2.0",error:{code:-32700,message:"Parse error"}},400);
    if(error instanceof NutritionProtocolError || error instanceof NutritionInputError)return nutritionJson({jsonrpc:"2.0",...((rpc?.id??requestId)!==undefined?{id:rpc?.id??requestId}:{}),error:{code:error instanceof NutritionProtocolError?error.code:-32602,message:error.message,...(error instanceof NutritionProtocolError && error.data?{data:error.data}:{})}},error instanceof NutritionProtocolError?error.status:400);
    return nutritionErrorResponse(error);
  }
}
export async function GET(){return nutritionJson({error:"method_not_allowed"},405,{Allow:"POST"});}
export async function DELETE(){return GET();}
