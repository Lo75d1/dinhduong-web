import DataManager from "./DataManager";
import ImageSourceSync from "./ImageSourceSync";
import BulkClassifyEditor from "./BulkClassifyEditor";
import MedicationImport from "./MedicationImport";

export const metadata = { title: "Biên tập dữ liệu | Dinh dưỡng 2598" };

export default function Page() {
  return <div className="flex flex-col gap-5"><ImageSourceSync /><BulkClassifyEditor /><MedicationImport /><div className="data-manager-without-image-sync"><DataManager /></div><style>{`.data-manager-without-image-sync > div > section:nth-of-type(2){display:none}`}</style></div>;
}
