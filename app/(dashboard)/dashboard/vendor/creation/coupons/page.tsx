import { redirect } from "next/navigation";
import { listStoreCoupons } from "@/app/actions/store-coupons";
import CouponManager from "@/components/vendor/creation/CouponManager";
import { getSession } from "@/lib/auth/session";
import { getCreationLibrary } from "@/lib/vendor/creation/query";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await getSession();
 if(!session||session.role!=="VENDOR")redirect("/login");
 const [result,library]=await Promise.all([listStoreCoupons(),getCreationLibrary(session.userId)]);
 if(!library)redirect("/dashboard/vendor");
 if(!result.ok)throw new Error(result.error);
 return <CouponManager initialCoupons={result.coupons} creations={library.items}/>;
}
