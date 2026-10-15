# Link trang chu tu Facebook — 15/10/2026

- Yeu cau: link trang chu co duoi theo doi tu Facebook tu quay ve `/` sach. Chua co URL loi cu the tu nguoi dung; truoc sua, `/?fbclid=...` va UTM tra 200 nhung chua redirect. Khong khang dinh da tai hien loi 404 tren link that cua nguoi dung.
- Tai dung Server Component trang chu `src/app/page.tsx`: doc `searchParams` async theo Next16, co `fbclid`, `mibextid` hoac `utm_*` thi `redirect("/")` truoc khi truy van du lieu. Dich co dinh cung website, khong lay dich tu query; khong tao middleware/proxy/catch-all moi.
- Chi ap dung trang chu. Tim kiem, link Food/Dish, Ration, OAuth, API, QR va cac trang khac giu duong dan/tham so can thiet. Duong dan khong ton tai van 404; khong tu doan moi link Facebook deu phai ve trang chu.
- Prisma generate, TypeScript va ESLint file sua dat. Khong sua giao dien/noi dung, bo tinh, canonical Food/Dish, migration hay cau hinh VPS. Nhanh `codex/nutrition-chat-api`, cung PR #4, chua merge main.
- VPS preflight doc that: checkoutb83f02e, app59dc690 healthy, DB25/25, env/layout/Caddy/Google SHA khop. Nghiem thu build/HTTPS/browser ghi sau trien khai.
