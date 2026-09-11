"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { BASE_URL } from "@/lib/email/resend";

export type BulkUserAction="account_access"|"complete_store"|"welcome"|"verify_email"|"activate"|"suspend";
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
async function admin(){const s=await getSession();if(!s||s.role!=="ADMIN")throw new Error("Administrator access required.");return s;}
function template(title:string,name:string,copy:string,button:string,url:string){return `<!doctype html><body style="margin:0;background:#f6f4f1;font-family:Arial,sans-serif;color:#18181b"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 12px"><table width="100%" style="max-width:560px;background:white;border-radius:22px;overflow:hidden"><tr><td style="background:#1c1c1a;padding:24px;text-align:center;color:white;font-weight:800;font-size:22px">LinkWe<span style="color:#f06a2a">AI</span></td></tr><tr><td style="padding:34px"><h1 style="font-size:24px;margin:0 0 16px">${esc(title)}</h1><p style="font-size:15px;line-height:1.7;color:#52525b">Hi ${esc(name)},</p><p style="font-size:15px;line-height:1.7;color:#52525b">${copy}</p><a href="${url}" style="display:inline-block;margin-top:18px;background:#d4450a;color:white;text-decoration:none;border-radius:12px;padding:14px 22px;font-weight:800">${esc(button)} →</a><p style="margin-top:28px;font-size:11px;color:#a1a1aa">This secure link was sent by the LinkWe team.</p></td></tr></table></td></tr></table></body>`}
export async function runBulkUserAction(userIds:string[],action:BulkUserAction){await admin();const ids=[...new Set(userIds)].slice(0,250);if(!ids.length)return{error:"Select at least one user."};const users=await prisma.user.findMany({where:{id:{in:ids},isActive:true},select:{id:true,email:true,fullName:true,role:true,storesOwned:{select:{id:true}}}});if(action==="activate"||action==="suspend"){await prisma.user.updateMany({where:{id:{in:users.filter(u=>u.role!=="ADMIN").map(u=>u.id)}},data:{suspended:action==="suspend"}});revalidatePath("/dashboard/admin","layout");return{ok:true,count:users.length};}
  let sent=0;for(const u of users){let subject="",html="";
    if(action==="account_access"){const raw=randomBytes(32).toString("hex");await prisma.user.update({where:{id:u.id},data:{resetToken:raw,resetTokenExpiry:new Date(Date.now()+60*60*1000)}});const url=`${BASE_URL}/reset-password?token=${raw}`;subject="Your secure LinkWe account access";html=template("Your LinkWe account is ready",u.fullName,`Your login email is <strong>${esc(u.email)}</strong>. For your security, LinkWe never sends passwords by email. Use the button below to create a private password. This link expires in one hour.`,"Set my password",url);}
    else if(action==="complete_store"){subject="Complete your LinkWe store";html=template("Your customers are waiting",u.fullName,"Finish your store profile, add your products or services, and publish when everything is ready. A complete storefront builds more trust and makes it easier for customers to buy.","Complete my store",`${BASE_URL}/dashboard/vendor/store/edit`);}
    else if(action==="verify_email"){subject="Verify your LinkWe email";html=template("Confirm your email address",u.fullName,"Confirming your email protects your account and makes sure you receive orders, messages and important business updates.","Verify email",`${BASE_URL}/dashboard`);}
    else {subject="Welcome to LinkWe";html=template("Welcome to LinkWe",u.fullName,"Your LinkWe account is ready. Explore local businesses, manage your account, and connect with the marketplace from one place.","Open LinkWe",`${BASE_URL}/dashboard`);}
    await sendEmail({to:u.email,subject,html});sent++;}
  return{ok:true,count:sent};
}
