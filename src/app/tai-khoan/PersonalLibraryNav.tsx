import Link from "next/link";

export default function PersonalLibraryNav({ active }: { active: "menu" | "food" | "dish" }) {
  return <nav aria-label="Dữ liệu của tôi" className="my-5 flex flex-wrap gap-2">{([
    ["menu", "thuc-don", "Thực đơn của tôi"], ["food", "thuc-pham", "Thực phẩm của tôi"], ["dish", "mon-an", "Món ăn của tôi"],
  ] as const).map(([key, path, label]) => <Link key={key} href={`/tai-khoan/${path}`} aria-current={active === key ? "page" : undefined} className={`rounded border border-[#8fa99e] px-3 py-2 text-sm ${active === key ? "bg-[#123c36] text-white" : "bg-white text-[#123c36]"}`}>{label}</Link>)}</nav>;
}
