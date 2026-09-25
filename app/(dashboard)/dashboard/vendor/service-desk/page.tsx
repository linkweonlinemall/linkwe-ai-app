import { getServiceDesk } from "@/lib/vendor/service-desk-query";
import ServiceDesk from "@/components/vendor/service-desk/ServiceDesk";

export default async function ServiceDeskPage() {
  const data = await getServiceDesk();
  return <ServiceDesk {...data} />;
}
