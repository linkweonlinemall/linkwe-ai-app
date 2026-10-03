import s from "./rex-portrait.module.css";
export default function RexPortrait({compact=false}:{compact?:boolean}){return <div className={`${s.portrait} ${compact?s.compact:""}`} aria-hidden="true"><div className={s.halo}/><img src="/images/home/rex-brand-v2.webp" alt=""/><span className={s.spark}>✦</span><span className={s.status}/></div>;}
