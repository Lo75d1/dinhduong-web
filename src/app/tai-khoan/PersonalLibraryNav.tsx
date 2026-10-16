import Link from "next/link";

export default function PersonalLibraryNav({ active }: { active: "menu" | "food" | "dish" }) {
  return <nav aria-label="Dữ liệu của tôi" className="my-5 grid gap-2 sm:grid-cols-3">{([
    ["menu", "thuc-don", "Thực đơn của tôi"], ["food", "thuc-pham", "Thực phẩm của tôi"], ["dish", "mon-an", "Món ăn của tôi"],
  ] as const).map(([key, path, label]) => <Link key={key} href={`/tai-khoan/${path}`} aria-current={active === key ? "page" : undefined} className={`rounded-md border px-4 py-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123c36] ${active === key ? "border-[#123c36] bg-[#123c36] text-white" : "border-[#d4dfd8] bg-white text-[#123c36] hover:bg-[#f1f6f2]"}`}>{label}</Link>)}</nav>;
}
