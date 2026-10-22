import { parseNutritionRpc, nutritionRpcResult, NutritionProtocolError, NUTRITION_MCP_VERSIONS, NUTRITION_SERVER_INFO, type NutritionRpc } from "@/lib/nutrition-chat/protocol";
import { getNutritionIdentity, nutritionJson, nutritionErrorResponse, validateNutritionOrigin, readNutritionJson, NutritionSecurityError, nutritionAuthenticateChallenge, enforceNutritionRateLimit, nutritionAnonymousKey } from "@/lib/nutrition-chat/security";
import { NUTRITION_TOOLS, NUTRITION_WORKFLOW, nutritionToolScope } from "@/lib/nutrition-chat/tools";
import { executeNutritionTool } from "@/lib/nutrition-chat/operations";
import { validateOperationObject } from "@/lib/nutrition-chat/service";
import { NutritionInputError, NUTRITION_LIMITS } from "@/lib/nutrition-chat/validation";
import {nutritionMcpOutput} from "@/lib/nutrition-chat/mcp-output";
import {nutritionSkillCatalog} from "@/lib/nutrition-chat/skill-catalog";
import {startGuestSession} from "@/lib/nutrition-chat/guest-session";
import {GUEST_TOOL_NAMES,nutritionErrorGuidance,nutritionResponseGuidance} from "@/lib/nutrition-chat/response-guidance";
import {ADMIN_MENU_TOOLS,isAdminMenuTool,executeAdminMenuTool} from "@/lib/menu-library/ai-tools";
import {menuLibraryAccessGuidance} from "@/lib/menu-library/connection";
const skillMethods=["skills/list","skills/get","resources/list","resources/read"];
const capabilities={tools:{listChanged:false},resources:{listChanged:false},extensions:{"io.modelcontextprotocol/skills":{}}};
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
    const publicRequest=["initialize","server/discover","tools/list","ping","notifications/initialized",...skillMethods].includes(rpc.method) || rpc.method==="tools/call" && ["get_workflow","start_guest_session"].includes(name);
    const rawArgs=rpc.params.arguments;
    const sessionToken=rawArgs && typeof rawArgs==="object" && !Array.isArray(rawArgs)?(rawArgs as Record<string,unknown>).sessionToken:undefined;
    if(sessionToken!==undefined && (typeof sessionToken!=="string" || !/^ng_[A-Za-z0-9_-]{43}$/.test(sessionToken)))throw new NutritionInputError("sessionToken chỉ nhận token phiên tạm từ start_guest_session; OAuth dùng header xác thực.","sessionToken");
    // A supplied OAuth header always wins and must be valid; never downgrade a bad
    // credential to guest mode. Anonymous session tokens cannot read account data.
    const authRequest=!hasAuthorization && typeof sessionToken==="string"?new Request(request.url,{headers:{...Object.fromEntries(request.headers),authorization:`Bearer ${sessionToken}`}}):request;
    const identity=hasAuthorization || !publicRequest?await getNutritionIdentity(authRequest,rpc.method==="tools/call"?nutritionToolScope(name)??"nutrition:read":"nutrition:read"):undefined;
    let toolArgs=rawArgs??{};
    // sessionToken is transport metadata on guest-capable tools. Consume it even
    // when the client also attaches a header; the validated header identity wins.
    if(GUEST_TOOL_NAMES.includes(name) && sessionToken!==undefined && toolArgs && typeof toolArgs==="object" && !Array.isArray(toolArgs)){const rest={...toolArgs as Record<string,unknown>};delete rest.sessionToken;toolArgs=rest;}
    if(rpc.id===undefined) {
      if(!rpc.modern && rpc.method==="notifications/initialized")return new Response(null,{status:202,headers:{"Cache-Control":"no-store"}});
      throw new NutritionProtocolError(-32601,"Notification not supported",404);
    }
    if(rpc.method==="initialize" && !rpc.modern) {
      validateOperationObject(rpc.params,["protocolVersion","capabilities","clientInfo","_meta"],["protocolVersion","capabilities","clientInfo"]);
      const version=NUTRITION_MCP_VERSIONS.slice(1).includes(rpc.params.protocolVersion as "2025-11-25")?rpc.params.protocolVersion:"2025-11-25";
      return nutritionJson(nutritionRpcResult(rpc,{protocolVersion:version,capabilities,serverInfo:NUTRITION_SERVER_INFO,instructions:NUTRITION_WORKFLOW.start+" "+NUTRITION_WORKFLOW.steps.join(" ")}));
    }
    if(rpc.method==="server/discover" && rpc.modern){validateOperationObject(rpc.params,["_meta"]);return nutritionJson(nutritionRpcResult(rpc,{supportedVersions:NUTRITION_MCP_VERSIONS,capabilities,instructions:NUTRITION_WORKFLOW.start+" "+NUTRITION_WORKFLOW.steps.join(" ")},true));}
    if(skillMethods.includes(rpc.method)){validateOperationObject(rpc.params,rpc.method==="skills/list"?["cursor","_meta"]:rpc.method==="resources/list"?["_meta"]:["uri","_meta"],rpc.method.endsWith("/get")||rpc.method==="resources/read"?["uri"]:[]);return nutritionJson(nutritionRpcResult(rpc,await nutritionSkillCatalog(rpc.method,rpc.params),true));}
    if(rpc.method==="ping"){validateOperationObject(rpc.params,["_meta"]);return nutritionJson(nutritionRpcResult(rpc,{}));}
    // Publish definitions before OAuth/delegation, including anonymous initial scans.
    // Every invocation still checks identity, Admin role and the live family grant.
    if(rpc.method==="tools/list"){validateOperationObject(rpc.params,["cursor","_meta"]);if(rpc.params.cursor!==undefined)throw new NutritionProtocolError(-32602,"Unknown cursor");return nutritionJson(nutritionRpcResult(rpc,{tools:[...NUTRITION_TOOLS,...ADMIN_MENU_TOOLS]},true));}
    if(rpc.method!=="tools/call")throw new NutritionProtocolError(-32601,"Method not found",404);
    validateOperationObject(rpc.params,["name","arguments","_meta"],["name"]);
    if(!nutritionToolScope(name)&&!isAdminMenuTool(name))throw new NutritionProtocolError(-32602,"Unknown tool");
    try {
      let result:unknown;
      if(name==="start_guest_session"){validateOperationObject(toolArgs,[]);result=await startGuestSession(request);}
      else if(name==="get_workflow" && !identity){validateOperationObject(toolArgs,[]);result={...NUTRITION_WORKFLOW,guidance:nutritionResponseGuidance(name,NUTRITION_WORKFLOW)};}
      else {
        if(!identity)throw new NutritionSecurityError("invalid_token",401,"Kết nối tài khoản để dùng công cụ này.",nutritionToolScope(name));
        result=isAdminMenuTool(name)?await executeAdminMenuTool(name,toolArgs,identity):await executeNutritionTool(name,toolArgs,identity);
      }
      const output=nutritionMcpOutput(name,result);
      return nutritionJson(nutritionRpcResult(rpc,{content:[{type:"text",text:output.text}],...(rpc.version!=="2025-03-26" && output.includeStructured?{structuredContent:output.data}:{})}));
    }catch(error) {
      if(!(error instanceof NutritionInputError))throw error;
      return nutritionJson(nutritionRpcResult(rpc,{isError:true,content:[{type:"text",text:JSON.stringify({error:"invalid_input",message:error.message,field:error.field,status:error.status,guidance:nutritionErrorGuidance(error.status,error.field)})}]}));
    }
  }catch(error) {
    // Delegation is an application permission, not a request for a new OAuth login.
    if(error instanceof NutritionSecurityError && error.code==="menu_library_access" && rpc?.method==="tools/call" && rpc.id!==undefined && isAdminMenuTool(String(rpc.params.name))){
      return nutritionJson(nutritionRpcResult(rpc,{isError:true,content:[{type:"text",text:JSON.stringify({error:error.code,status:error.status,error_description:error.description,guidance:menuLibraryAccessGuidance()})}]}));
    }
    // Guest-capable tools are usable without OAuth. Return a recoverable tool error
    // rather than an OAuth challenge that would force a login on expired sessions.
    if(error instanceof NutritionSecurityError && error.code==="invalid_token" && !request.headers.has("authorization") && rpc?.method==="tools/call" && rpc.id!==undefined && GUEST_TOOL_NAMES.includes(String(rpc.params.name))){
      const recovery={error:"guest_session_required",error_description:"Mở phiên tạm bằng start_guest_session, rồi truyền accessToken trong arguments.sessionToken; không cần đăng nhập.",guidance:{...nutritionErrorGuidance(401),nextTools:["start_guest_session"]}};
      return nutritionJson(nutritionRpcResult(rpc,{isError:true,content:[{type:"text",text:JSON.stringify(recovery)}]}));
    }
    if(error instanceof NutritionSecurityError && rpc?.method==="tools/call" && rpc.id!==undefined && (error.code==="invalid_token" || error.code==="insufficient_scope")){
      const scope=error.scope??nutritionToolScope(String(rpc.params.name))??"nutrition:read";
      const challenge=`${nutritionAuthenticateChallenge(scope,error.code)}, error_description="Connect your Dinh duong 2598 account to continue"`;
      return nutritionJson(nutritionRpcResult(rpc,{isError:true,content:[{type:"text",text:JSON.stringify({error:error.code,error_description:error.description,guidance:nutritionErrorGuidance(error.status)})}],_meta:{"mcp/www_authenticate":[challenge]}}),error.status,{"WWW-Authenticate":challenge});
    }
    if(error instanceof NutritionSecurityError && rpc?.method==="tools/call" && rpc.id!==undefined){return nutritionJson(nutritionRpcResult(rpc,{isError:true,content:[{type:"text",text:JSON.stringify({error:error.code,error_description:error.description,guidance:nutritionErrorGuidance(error.status)})}]}),error.status,error.retryAfter!==undefined?{"Retry-After":String(error.retryAfter)}:undefined);}
    if(error instanceof NutritionSecurityError && error.code==="invalid_request" && error.status===400 && !rpc)return nutritionJson({jsonrpc:"2.0",error:{code:-32700,message:"Parse error"}},400);
    if(error instanceof NutritionProtocolError || error instanceof NutritionInputError){
      const details=error instanceof NutritionProtocolError && error.data && typeof error.data==="object" && !Array.isArray(error.data)?error.data:{};
      return nutritionJson({jsonrpc:"2.0",...((rpc?.id??requestId)!==undefined?{id:rpc?.id??requestId}:{}),error:{code:error instanceof NutritionProtocolError?error.code:-32602,message:error.message,data:{...details,guidance:nutritionErrorGuidance(error.status,error instanceof NutritionInputError?error.field:undefined)}}},error instanceof NutritionProtocolError?error.status:400);
    }
    return nutritionErrorResponse(error);
  }
}
export async function GET(){return nutritionJson({error:"method_not_allowed"},405,{Allow:"POST"});}
export async function DELETE(){return GET();}
