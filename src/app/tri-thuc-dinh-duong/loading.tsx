export default function KnowledgeHubLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-5">
      <div className="h-64 rounded-2xl bg-[#d8e8e1]" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-20 rounded-xl bg-white" />
        <div className="h-20 rounded-xl bg-white" />
        <div className="h-20 rounded-xl bg-white" />
      </div>
      <div className="h-48 rounded-xl bg-white" />
      <p className="text-center text-sm text-neutral-700">Đang tìm trong các nguồn đã kết nối…</p>
    </div>
  );
}

