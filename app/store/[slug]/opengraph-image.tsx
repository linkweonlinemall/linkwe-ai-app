import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const alt = "LinkWe store";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function StoreOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({ where: { slug: slug.trim().toLowerCase() }, select: { name: true, tagline: true, coverPhotoUrl: true, logoUrl: true } });
  const name = store?.name ?? "LinkWe Store";
  return new ImageResponse(<div style={{ width:"100%", height:"100%", display:"flex", position:"relative", color:"white", background:"linear-gradient(135deg,#171715,#4b1d0c)", fontFamily:"Arial" }}>
    {store?.coverPhotoUrl ? <img src={store.coverPhotoUrl} alt="" width="1200" height="630" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/> : null}
    <div style={{position:"absolute",inset:0,display:"flex",background:"linear-gradient(90deg,rgba(0,0,0,.92),rgba(0,0,0,.45) 65%,rgba(0,0,0,.22))"}}/>
    <div style={{display:"flex",alignItems:"center",gap:30,margin:"auto 64px 64px",zIndex:2}}>
      <img src={store?.logoUrl ?? "https://www.linkweonlinemall.com/linkwe-logo-mark-on-dark.png"} alt="" width="112" height="112" style={{width:112,height:112,borderRadius:28,objectFit:"cover",border:"4px solid rgba(255,255,255,.85)"}}/>
      <div style={{display:"flex",flexDirection:"column",maxWidth:850}}><div style={{display:"flex",alignItems:"center",gap:18,fontSize:58,fontWeight:800,lineHeight:1.05}}><img src="https://www.linkweonlinemall.com/linkwe-logo-mark-on-dark.png" alt="" width="58" height="58" style={{width:58,height:58,objectFit:"contain"}}/>{name}</div>{store?.tagline ? <div style={{fontSize:25,color:"rgba(255,255,255,.78)",marginTop:16}}>{store.tagline}</div>:null}<div style={{fontSize:18,color:"#f5a06c",fontWeight:700,marginTop:20,letterSpacing:2}}>SHOP ON LINKWE</div></div>
    </div>
  </div>, size);
}
