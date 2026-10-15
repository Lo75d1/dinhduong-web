# Bo cuc sheet Thuc don — 15/10/2026

## Yeu cau da chot

- Giu bao cao phan tich va tiep tuc sua dau vao tai `Nhap khau phan`; khong chuyen quyen nhap sang `Thuc don`.
- `Thuc don` tach Ngay, Bua, Mon an, Thuc pham; hien dinh luong va kcal/dam/beo/bot duong. Nguon/ghi chu gom mot cot cuoi. Muc tieu/doi chieu chi o phan bao cao.
- Chu Times New Roman 15 trong sheet, zoom 100%, luoi Excel binh thuong, khong frozen pane/shrink-to-fit chu. A4 ngang van fit chieu rong khi in; co chu tren giay do Excel scale theo bang, khong cam ket ban in 15 pt.
- Mon VDD loai MA la so lieu tong hop ca mon, khong co danh sach nguyen lieu. Khong OCR anh hoac tu suy ra nguyen lieu o luot nay.

## Thay doi va tai dung

- `workbook-report.ts`: 11 cot: Ngay / Bua / Mon an / Thuc pham / Dinh luong / Don vi / Nang luong / Dam / Beo / Bot duong / Nguon-ghi chu.
- Dinh luong = luong nhap x so suat, giu g/ml; so lieu 4 chat lien ket ket qua `Nhap khau phan`, khong dung mot engine khac. Thong tin luong moi suat, so suat, quy doi an duoc van day du o bang nhap.
- Khong tao hang trong cho ngay khong co thuc pham. Duong ke phan biet ngay/bua; khong gop o trong than bang. So khong wrap thanh tung chu so; chu trong ten va ghi chu xuong theo tu.
- Rut nhan cong thuc uoc tinh trong cot ghi chu; du lieu/nguon/cong thuc day du van giu o cac bang dau vao/doi soat. Chieu cao dua tren noi dung ngan hien thi, tranh lay ca doan canh bao cu lam hang rong bat thuong.
- `workbook.ts`: bat luoi va zoom 100% rieng bang nhap; giu thiet ke cac bao cao khac. Khong doi manifest/parser/import/nguon/muc tieu/bo tinh/bao ve o.
- Mo rong hai script kiem chung hien co; khong dung builder moi hoac them dependency. Web/chat van dung cung ExcelJS builder da co.
- Khong DB write, migration, seed, Food/Dish update hoac OAuth change.

## Kiem chung

- Prisma generate, TypeScript, ESLint file sua va diff check dat. Production build local dat truoc chinh tinh do cao/nhan ghi chu; typecheck va test phan bi anh huong chay lai sau chinh.
- Full Nutrition Chat suite dat: core67/report37/security89/OAuth261/storage82/HTTP201/library60 va workbook/report. `test:nutrition-complete` chay lai sau chinh cuoi: phu 162 truong (160 tinh + 2 doi soat), nguon theo phan/ml, 0/thieu, ngay rong, so suat va import hop dong cu dat.
- Excel desktop: 32 checks dau; 27 checks sau chinh cuoi (chi xuat lai trang Thuc don, khong render lai 5 sheet khong sua). Thu luong x so suat 300 x 2 = 600 va 780 kcal; bao cao 1.180 kcal, vitamin D 18; nguon theo phan 400 ml = 200 kcal, 0/thieu va quet loi tat ca sheet dat. Da phuc hoi dau vao truoc luu ban kiem chung.
- Xem ban in A4 ngang: Thuc don 1 trang, tieu de cot khong cat, hang khong bi gian theo doan canh bao dai. Bao cao chinh 3 trang va cac phu luc giu so trang o fixture. Anh ignore `evidence/nutrition-chat/plan-before.png` va `plan-after.png`; du lieu mau kiem thu.

## VPS

- Chu du an da cho phep trien khai cung nhanh o cac luot truoc; tiep tuc PR #4, chua merge main.
- Preflight: checkout f9c1500, app healthy; DB25/25; env/layout/Caddy/Google rieng giu nguyen.
- App **5994ff2** da build Linux/TypeScript va healthy. Backup image/config: `/opt/dinhduong-release-backups/nutrition-plan-layout-20261015-181911-codex`; khong ap migration.
- HTTPS **30 checks** dat tren 2 file xuat that (1 ngay: 3 dong; 2 ngay: 4 dong), dung 1 Food VDD MA va tron ven 2 nguyen lieu da lien ket cua 1 Dish RNI. Tong doc lap 274,1 va 372,95 kcal khop bao cao. Export-only, khong luu tai khoan/tao user/session/menu fixture.
- Excel desktop tren 2 file that: **28 checks** dat; ca mon VDD va moi nguyen lieu RNI tinh dung, zero giu so 0, sua 100 -> 200 g thanh 131,8 kcal va bao cao tu cap nhat. Giu 3.719 hyperlink Food; quet tat ca sheet khong loi. Ban in Thuc don 1 trang, chu cot/ten mon khong bi cat; anh ignore `plan-vps-layout.png`.
- File SaveAs native doc lai: **4 checks** dat, dinh luong da sua 200, so dong 3/1 va nguon cong thuc RNI giu dung; engine tinh lai 438,85 kcal, khop Excel. Day la nghiem thu parser that, khong phai upload vao tai khoan that.
- Count/digest Food (3.719), Dish (7.369), DishIngredient (41.457) va 25 migration khop truoc/sau ca export. Env/layout/Caddy/Google khop SHA; timer active/enabled, khong OOM, swap build da go. Nhanh/PR van chua merge main.

## Ghi chu du lieu ngoai pham vi

- Khi chon mau, `Com rang thap cam (Mixed fried rice)` tu VDD MA co tong P/L/G raw 128,4 tren co so 100 g. Guard chat luong hien co loai cac chat chinh nay khoi phep cong; giu theo quy uoc README-data, khong sua kho o dot bo cuc. Mau nghiem thu so lieu du chon Food MA khac da qua guard; khong coi doi bo cuc la sua duoc du lieu nguon can xac minh.

## Bo sung hien nhan theo nhom — cung ngay 15/10

- Yeu cau tiep: cot Ngay va Mon an chi hien o dong dau nhom lien tiep; cac dong sau de trong. Bua/Thuc pham va so lieu van giu tung dong.
- Chi doi hai cong thuc trinh bay A/C cua `Thuc don`: Ngay doi theo so ngay dau vao; Mon doi theo ngay + bua + ten mon. Mon quay lai sau mon khac hoac sang bua/ngay khac deu hien lai. So sanh ten chinh xac, khong suy nhom tu o hien thi da de trong.
- `Nhap khau phan` giu du nhan ngay/bua/mon de tinh va nhap lai. Khong merge o than bang, khong doi bo tinh/parser/manifest. Chieu cao hang dua tren nhan thuc su hien thi.
- `test:nutrition-complete`, Prisma generate, TypeScript, ESLint file sua va diff check dat. Them ca nhom lap, mon khong lien tiep quay lai, cung mon sang ngay khac va nhap lai van du nhan.
- Excel desktop: 31 checks dat, gom nhan dau nhom, doi bua/ngay tu hien lai, tra ve nhom cu tu an nhan, nhan dau vao van du va cac kiem tra so lieu cu. Ban in Thuc don 1 trang; anh ignore `plan-grouped.png`.
- Nghiem thu VPS: cho trien khai.
