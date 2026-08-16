# Bang chung nghiem thu tinh chinh bao an

Ngay chay: 2026-08-16. Nhanh: `codex/tinh-chinh-bao-an`.

## Moi truong DB thu co lap

- PostgreSQL local: `127.0.0.1:55433`, database `nutrition_acceptance`.
- Da chay `prisma migrate deploy` voi migration `20260816233000_add_kitchen_menu_photos`.
- `prisma migrate status`: 20 migrations, schema up to date.
- Khong ap migration len DB dung chung/VPS.
- Seed mot `KitchenMenuItem` da duyet voi `photoStoragePath`; file anh public-read duoc phuc vu tu fixture local theo dung cau truc URL Supabase Storage de render UI.

## Ket qua nghiep vu/UI

1. Dieu duong co dung mot `DepartmentMembership`: khong hien selector khoa.
2. `ENABLE_DIET_ORDERS=false`: an cot goi y tu chi dinh, ghi chu tro lai khong bat buoc, man bac si khong duoc mo.
3. Bep `KITCHEN_STAFF`: chi item da duyet co o tai/doi anh; anh doi chung hien tren item dung ngay x bua x che do.
4. Benh nhan: chi item da duyet co anh moi hien anh suat mau; item khong co anh khong tao khoang trong.
5. Anh mau khong chua du lieu nguoi benh. Upload chap nhan JPEG/PNG/WebP, toi da 5 MiB.
6. Bep co bang tem theo khoa x bua x che do; moi suat SUBMITTED/LOCKED tao dung mot tem A4, khong co PII.

Anh:

- `01-bao-suat-mot-khoa-feature-off-desktop.png`: desktop 1280 px, selector khoa va cot goi y da an.
- `02-bep-anh-doi-chung-desktop.png`: desktop 1280 px, anh doi chung va nut doi anh.
- `03-benh-nhan-anh-doi-chung-mobile-390.png`: mobile 390 px, anh suat mau dung che do.
- `04-tem-suat-an-bep-desktop.png`: desktop 1280 px, tong 10 tem khop 2 khoa va 2 che do trong DB thu.

## Gate cuoi

```text
npx prisma generate                          PASS
npm run test:meal-photo                     PASS
npm run test:diet-orders                    PASS
npm run test:kitchen-snapshot               PASS
npm run test:meal-labels                    PASS
npx tsc --noEmit                            PASS
npx eslint <cac file thay doi>              PASS
npm run build -- --webpack                  PASS (88/88 pages)
```

Build co route moi `/api/kitchen-menu/photo`.

## Luu y trien khai

- Chua deploy, chua migrate DB VPS.
- VPS can khai bao `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MEAL_PHOTO_BUCKET` va tao bucket public-read khong cho list; service-role chi nam phia server.
- Upload that len Supabase chua duoc goi trong nghiem thu local vi khong dua credential production vao may thu. Validation, path, public URL, phan quyen route va hai man doc anh da duoc verify; lan deploy can smoke-test mot upload anh khong chua PII tren bucket da cau hinh.
