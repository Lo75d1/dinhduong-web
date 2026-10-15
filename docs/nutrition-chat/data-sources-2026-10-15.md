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
- Khong them test file cho thay doi link/giao dien tinh; da nghiem thu HTTPS/browser that ben duoi.

## Trien khai

- Chu du an da yeu cau truc tiep len VPS o luot truoc; tiep tuc cung nhanh/PR #4, chua merge main. Khong ap migration.
- Preflight that: checkout `32e040e`, app healthy; 25 migration; local override Caddy/layout/Google va env khop bien ban thu vien.
- App **ba2829d** da build Linux/TypeScript va healthy. Backup image/config: `/opt/dinhduong-release-backups/nutrition-sources-20261015-174838-codex`; image rollback duoc giu bang tag rieng.
- **42 kiem tra HTTPS dat**: quan tri du lieu, 2 bo loc nguon thuc pham, mon an, tai lieu tham khao co 3 anchor dung URL/target/noreferrer; 4 chi tiet (VDD Food, VDD MA, RNI Food, RNI Dish) dung nguon va ma/co thong bao thieu ma; health va Google verification 200.
- Browser that: khung nguon 3 cot tren trang quan tri, mo VDD thuc pham ra trang tra cuu chinh thuc; RNI ra trang dang nhap; chi tiet VDD MA hien `HAP-223025` va link dung trang mon an. Anh ignore `evidence/nutrition-chat/vps-data-source-links.png`. Khong dang nhap/tạo fixture hay sua du lieu; tab kiem thu da dong.
- Count/digest Food (3.719), Dish (7.369), DishIngredient (41.457) va so migration (25) khop truoc/sau. Env/layout/Caddy/Google khop SHA; timer active/enabled, khong OOM, swap build da go.
- Khong thay doi Excel/API dong bo/nguon trong payload o luot nay. Link nguon ngoai la tra cuu chung; khong cam ket mo thang ban ghi hoac bo qua dang nhap RNI.
