# Lien ket nguon du lieu VDD/RNI — 15/10/2026

## Pham vi

- Yeu cau: bo sung link dinh duong VDD/RNI vao trang du lieu.
- Tai dung trang quan tri du lieu, danh muc/chi tiet Food-Dish va tai lieu tham khao hien co. Khong them trang, bang, migration, cong cu dong bo hoac sua du lieu canonical.
- Khai bao chung tai `src/lib/nutrition-data-sources.ts`; giao dien chung tai `src/components/NutritionDataSources.tsx`.
- Khung nguon nam ngay sau phan gioi thieu o `/quan-tri/du-lieu`, `/thuc-pham`, `/mon-an`. Chi tiet hien ma nguon va link tra cuu tuong ung VDD Food / VDD MA / RNI. Nguon khac khong bi gan nham link.
- `/tai-lieu-tham-khao` tai dung cung danh muc link, giu muc sach BCTP cu.

## Nguon da doi chieu

- VDD thuc pham: https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-thuc-pham — trang tra cuu theo ten/ma, kiem bang web tool 15/10/2026.
- VDD mon an: https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-mon-an — trang tra cuu rieng, khop `CLAUDE_HANDOFF.md` va web tool.
- RNI: https://app.thucdongiadinh.vn/ — khop nguon da co; HTTPS 200 sau redirect `/Ui/Login` bang curl. Web reader khong truy cap duoc. Giao dien ghi ro can dang nhap.
- Tat ca la **trang tra cuu chung**, khong gia lam permalink tung dong. Khong dung `imageSourceUrl` thay nguon so lieu.

## Kiem chung local

- `prisma generate`, TypeScript va production build dat.
- ESLint 8 file sua: 0 loi; 3 canh bao `<img>` cu tai hai danh muc, khong thay phan anh ngoai pham vi.
- `git diff --check` dat.
- Khong them test file cho thay doi link/giao dien tinh. Nghiem thu HTTPS/browser VPS se ghi sau khi trien khai.

## Trien khai

- Chu du an da yeu cau truc tiep len VPS o luot truoc; tiep tuc cung nhanh/PR #4, chua merge main. Khong ap migration.
- Preflight that: checkout `32e040e`, app healthy; 25 migration; local override Caddy/layout/Google va env khop bien ban thu vien.
- Trang thai nghiem thu VPS: dang cho build/trien khai.
