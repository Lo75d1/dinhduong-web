import Link from "next/link";
import type { ReactNode } from "react";
import PersonalLibraryNav from "./PersonalLibraryNav";

export default function PersonalLibraryLayout({ active, title, description, children }: { active:"menu"|"food"|"dish"; title:string; description?:string; children:ReactNode }) {
  return <section className="mx-auto w-full min-w-0 max-w-6xl text-[#123c36]">
    <header className="border-b-2 border-[#123c36] pb-5">
      <Link href="/tai-khoan" className="text-sm text-neutral-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#123c36]">Tài khoản của tôi</Link>
      <h1 className="mt-3 text-3xl font-semibold leading-tight">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-base leading-relaxed text-neutral-600">{description}</p> : null}
    </header>
    <PersonalLibraryNav active={active}/>
    <div className="min-w-0 rounded-lg border border-[#d4dfd8] bg-white p-4 sm:p-6">{children}</div>
  </section>;
}
