"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { markOrderReceived } from "@/app/actions/order-received";
import styles from "@/components/customer/customer.module.css";
export default function MarkReceivedButton({orderId,initiallyConfirming=false}:{orderId:string;initiallyConfirming?:boolean}) {
 const router=useRouter();const [confirming,setConfirming]=useState(initiallyConfirming);const [pending,startTransition]=useTransition();const [error,setError]=useState("");
 function confirm(){setError("");startTransition(async()=>{try{const data=new FormData();data.set("orderId",orderId);const result=await markOrderReceived(data);if("error" in result){setError(result.error);return;}router.refresh();}catch{setError("We couldn’t confirm your order. Please try again.");}});}
 return <div className={styles.confirm}><strong>{confirming?"Everything arrived, safe and sound?":"Your order has been delivered."}</strong><p>{confirming?"Confirm only when you’ve received every item in your order. This completes the order and releases the stores’ earnings.":"Let your local stores know it’s with you."}</p>{error&&<p role="alert" className={styles.issue}>{error}</p>}<div>{confirming?<><button className={styles.secondary} disabled={pending} onClick={()=>setConfirming(false)}>Not yet</button><button className={styles.primary} disabled={pending} onClick={confirm}>{pending?"Confirming…":"Yes, everything is here"}<CheckCheck size={17}/></button></>:<button className={styles.primary} onClick={()=>setConfirming(true)}>Confirm my order arrived<CheckCheck size={17}/></button>}</div></div>;
}
