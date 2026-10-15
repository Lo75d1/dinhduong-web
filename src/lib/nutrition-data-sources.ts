// Trang tra cứu chung của nguồn; không phải permalink của từng Food/Dish.
export const NUTRITION_DATA_SOURCES = [
  {
    id: "vdd-foods",
    title: "Tra cứu dinh dưỡng thực phẩm VDD",
    publisher: "Viện Dinh dưỡng",
    tag: "Dữ liệu thực phẩm",
    note: "Tra cứu thành phần dinh dưỡng theo tên hoặc mã thực phẩm tại nguồn VDD.",
    href: "https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-thuc-pham",
  },
  {
    id: "vdd-dishes",
    title: "Tra cứu dinh dưỡng món ăn VDD",
    publisher: "Viện Dinh dưỡng",
    tag: "Dữ liệu món ăn",
    note: "Số liệu dinh dưỡng của món đã chế biến. Trong kho này, các bản ghi VDD loại Món ăn (MA) không có công thức nguyên liệu.",
    href: "https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-mon-an",
  },
  {
    id: "rni",
    title: "Dữ liệu dinh dưỡng và công thức RNI",
    publisher: "RNI · Thực đơn gia đình",
    tag: "Dữ liệu thực phẩm và món ăn",
    note: "Nguồn thực phẩm, công thức món ăn và định lượng nguyên liệu. Trang nguồn yêu cầu đăng nhập để tra cứu.",
    href: "https://app.thucdongiadinh.vn/",
  },
] as const;

export function nutritionDataSource(source: string, foodType?: string | null) {
  if (source === "VDD") return NUTRITION_DATA_SOURCES[foodType === "MA" ? 1 : 0];
  if (source === "RNI") return NUTRITION_DATA_SOURCES[2];
  return null;
}
