import OperationsApp from "@/app/meal-operations/OperationsApp";

export const metadata = { title: "Chỉ định chế độ ăn | Dinh dưỡng 2598" };

export default function Page() {
  return <OperationsApp mode="doctor" />;
}
