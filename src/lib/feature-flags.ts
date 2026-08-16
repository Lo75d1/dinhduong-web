import "server-only";

export function dietOrdersEnabled() {
  return process.env.ENABLE_DIET_ORDERS === "true";
}
