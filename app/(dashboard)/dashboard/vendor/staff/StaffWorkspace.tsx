"use client";
import {useState} from "react";
import Link from "next/link";
import type {getVendorStaff} from "@/app/actions/staff";
import AvailabilityClient from "./AvailabilityClient";
import TeamWorkspace from "./TeamWorkspace";
import AvailabilityToggle from "@/components/vendor/AvailabilityToggle";
import s from "@/components/vendor/business-workspace.module.css";
import type {ComponentProps} from "react";
export type AssignmentBooking={id:string;productId:string;bookingDate:string;startTime:string;endTime:string;staffMemberId:string|null;product:{name:string}};
export default function StaffWorkspace({availability,staff,bookings,store}:{availability:ComponentProps<typeof AvailabilityClient>;staff:Awaited<ReturnType<typeof getVendorStaff>>;bookings:AssignmentBooking[];store:{name:string;slug:string;visible:boolean;status:string;verification:string;isAvailableNow:boolean;services:{id:string;name:string;isPublished:boolean;isAvailable:boolean}[]}}){
 const [tab,setTab]=useState("availability");
 return <div className={s.stack}><nav className={s.tabs} aria-label="Staff workspace"><button data-tour="staff-availability-tab" aria-pressed={tab==="availability"} onClick={()=>setTab("availability")}>Service availability</button><button data-tour="staff-team-tab" aria-pressed={tab==="team"} onClick={()=>setTab("team")}>Team & assignments</button><button data-tour="staff-visibility-tab" aria-pressed={tab==="visibility"} onClick={()=>setTab("visibility")}>Store visibility</button></nav>
 <div hidden={tab!=="availability"}><AvailabilityClient {...availability}/></div>
 <div hidden={tab!=="team"}><TeamWorkspace initialStaff={staff} services={availability.services.map(v=>({id:v.id,name:v.name}))} bookings={bookings}/></div>
 <div hidden={tab!=="visibility"} style={tab!=="visibility"?{display:"none"}:undefined} className={s.stack} data-tour="staff-visibility"><div className={s.two}><section className={s.hero}><p className={s.eyebrow} style={{color:"#c8dcb5"}}>Your storefront</p><h2 className={s.heading}>{store.visible?"Customers can discover your store":"Your store is not publicly available yet"}</h2><p className={s.muted}>{store.visible?"Your store is active and verification is approved. Published listings can appear to customers.":`Store: ${store.status.toLowerCase().replaceAll("_"," ")} · Verification: ${store.verification.toLowerCase().replaceAll("_"," ")}. Both an active store and approved verification are needed.`}</p><div className={s.miniLinks}><Link href={`/store/${store.slug}`} className={s.secondary}>View storefront ↗</Link><Link href="/dashboard/vendor/store/edit" className={s.secondary}>Edit store</Link></div></section><AvailabilityToggle initialAvailable={store.isAvailableNow}/></div><section className={s.card}><h2 className={s.heading}>Service visibility</h2><p className={s.muted}>Publishing controls discovery. Availability controls whether a service accepts new bookings. Existing appointments stay in Service Desk.</p>{store.services.length?store.services.map(service=><div key={service.id} className={s.divider}><div className={s.row}><strong style={{fontSize:14}}>{service.name}</strong><div className={s.miniLinks} style={{margin:0}}><span className={s.badge}>{service.isPublished?"Published":"Draft"}</span><span className={s.badge}>{service.isAvailable?"Available":"Paused"}</span><Link className={s.link} href={`/dashboard/vendor/services/${service.id}/edit`}>Edit ↗</Link></div></div></div>):<p className={s.empty}>Create your first service to manage its visibility here.</p>}</section></div>
 </div>;
}
