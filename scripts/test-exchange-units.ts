import { getExchangeRule } from "../src/app/tinh-khau-phan/exchange-units";

function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }

assert(getExchangeRule("Nhóm lương thực")?.type === "glucid", "Lương thực phải quy theo glucid");
assert(getExchangeRule("Nhóm thịt các loại, cá và hải sản")?.type === "protein", "Thịt cá phải quy theo protein");
assert(getExchangeRule("Nhóm dầu ăn, mỡ các loại")?.type === "lipid", "Dầu mỡ phải quy theo lipid");
assert(getExchangeRule("Gia vị") === null, "Gia vị không tính đơn vị ăn");
console.log("Exchange-unit rules passed.");
