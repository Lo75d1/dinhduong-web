/** Pure JSON-RPC/HTTP validation, shared by the handler and protocol tests. */
import toolGuide from "./tool-guide.json";
export const NUTRITION_MCP_VERSIONS=["2026-07-28","2025-11-25","2025-06-18","2025-03-26"] as const;
export const NUTRITION_SERVER_INFO={name:"dinh-duong-2598",version:toolGuide.version};
export class NutritionProtocolError extends Error {
  constructor(public code:number,message:string,public status=400,public data?:unknown){super(message);}
}
export type NutritionRpc={jsonrpc:"2.0";id?:string|number;method:string;params:Record<string,unknown>;version:string;modern:boolean};
export function parseNutritionRpc(value:unknown,headers:Headers):NutritionRpc {
  if(!value || typeof value!=="object" || Array.isArray(value))throw new NutritionProtocolError(-32600,"Invalid request; batches are not supported");
  const body=value as Record<string,unknown>;
  if(Object.keys(body).some(k=>!["jsonrpc","id","method","params"].includes(k)) || body.jsonrpc!=="2.0" || typeof body.method!=="string" || !body.method || body.method.length>100 || (body.id!==undefined && !(typeof body.id==="string" && body.id.length<=100 || typeof body.id==="number" && Number.isSafeInteger(body.id))))throw new NutritionProtocolError(-32600,"Invalid request");
  if(body.params!==undefined && (!body.params || typeof body.params!=="object" || Array.isArray(body.params)))throw new NutritionProtocolError(-32602,"Invalid params");
  const params=(body.params??{}) as Record<string,unknown>;
  const requested=headers.get("mcp-protocol-version") ?? "2025-03-26";
  const meta=params._meta && typeof params._meta==="object" && !Array.isArray(params._meta)?params._meta as Record<string,unknown>:{};
  const modern=requested==="2026-07-28" || meta["io.modelcontextprotocol/protocolVersion"]==="2026-07-28";
  if(!NUTRITION_MCP_VERSIONS.includes(requested as typeof NUTRITION_MCP_VERSIONS[number]))throw new NutritionProtocolError(-32022,"Unsupported protocol version",400,{supported:NUTRITION_MCP_VERSIONS,requested});
  const accept=headers.get("accept")??"";
  if(!accept.includes("application/json") || !accept.includes("text/event-stream"))throw new NutritionProtocolError(-32600,"Accept must include application/json and text/event-stream",406);
  if(modern) {
    if(!headers.has("mcp-protocol-version") || meta["io.modelcontextprotocol/protocolVersion"]!==requested || headers.get("mcp-method")!==body.method)throw new NutritionProtocolError(-32020,"Header mismatch");
    const capabilities=meta["io.modelcontextprotocol/clientCapabilities"];
    if(!capabilities || typeof capabilities!=="object" || Array.isArray(capabilities))throw new NutritionProtocolError(-32602,"Missing clientCapabilities metadata");
    if(body.method==="tools/call") {
      const header=headers.get("mcp-name"); let name=header;
      if(header?.startsWith("=?base64?") && header.endsWith("?=")) {
        const encoded=header.slice(9,-2);
        if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw new NutritionProtocolError(-32020,"Malformed Mcp-Name");
        try{name=new TextDecoder("utf-8",{fatal:true}).decode(Buffer.from(encoded,"base64"));}catch{throw new NutritionProtocolError(-32020,"Malformed Mcp-Name");}
      }
      if(!name || name!==params.name)throw new NutritionProtocolError(-32020,"Mcp-Name mismatch");
    }
  }
  return {jsonrpc:"2.0",id:body.id as string|number|undefined,method:body.method,params,version:requested,modern};
}
export function nutritionRpcResult(rpc:NutritionRpc,result:Record<string,unknown>,cacheable=false) {
  const meta=result._meta && typeof result._meta==="object" && !Array.isArray(result._meta)?result._meta as Record<string,unknown>:{};
  return {jsonrpc:"2.0",id:rpc.id,result:rpc.modern?{...result,resultType:"complete",_meta:{...meta,"io.modelcontextprotocol/serverInfo":NUTRITION_SERVER_INFO},...(cacheable?{ttlMs:60_000,cacheScope:"private"}:{})}:result};
}
