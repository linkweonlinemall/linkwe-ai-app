import { Check } from "lucide-react";
import styles from "./customer.module.css";
export default function OrderProgress({steps,current}:{steps:string[];current:number}) {
 if(current<0)return null;
 return <ol className={styles.progress} aria-label="Order progress">{steps.map((step,index)=><li key={step} data-done={index<=current} aria-current={index===current?"step":undefined}><span>{index<current?<Check size={13}/>:index+1}</span><small>{step}</small></li>)}</ol>;
}
