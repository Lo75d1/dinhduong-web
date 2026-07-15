import DataManager from "./DataManager";
import RniImageSync from "./RniImageSync";

export const metadata = { title: "Biên tập dữ liệu | Dinh dưỡng 2598" };

export default function Page() {
  return <div className="flex flex-col gap-5"><DataManager /><RniImageSync /></div>;
}
