import HomeClient from "@/components/HomeClient";
import { loadDataset } from "@/lib/events";

export default function Page() {
  const meta = loadDataset();
  return <HomeClient meta={meta} />;
}
