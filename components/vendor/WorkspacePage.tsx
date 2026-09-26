import type { ReactNode } from "react";
import styles from "./business-workspace.module.css";
export default function WorkspacePage({eyebrow,title,description,action,children}:{eyebrow:string;title:string;description:string;action?:ReactNode;children:ReactNode}){
 return <div className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>{eyebrow}</p><h1 className={styles.title}>{title}</h1><p className={styles.intro}>{description}</p></div>{action}</header>{children}</div>;
}
