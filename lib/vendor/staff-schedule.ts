export type StaffDay={dayOfWeek:number;startTime:string;endTime:string;slotDurationMins:number;slotBufferMins:number;isActive:boolean};
export function validStaffTime(value:string){return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);}
export function staffMinutes(value:string){const [h,m]=value.split(":").map(Number);return h*60+m;}
export function validateStaffSchedule(schedule:StaffDay[]){
 if(!Array.isArray(schedule)||schedule.length>7||new Set(schedule.map(d=>d.dayOfWeek)).size!==schedule.length)return "Use one schedule per day.";
 for(const day of schedule){if(!Number.isInteger(day.dayOfWeek)||day.dayOfWeek<0||day.dayOfWeek>6||!validStaffTime(day.startTime)||!validStaffTime(day.endTime)||day.startTime>=day.endTime)return "Each day needs a valid start time before its end time.";if(!Number.isInteger(day.slotDurationMins)||day.slotDurationMins<15||day.slotDurationMins>480||!Number.isInteger(day.slotBufferMins)||day.slotBufferMins<0||day.slotBufferMins>120||typeof day.isActive!=="boolean")return "Use a duration of 15–480 minutes and a buffer of 0–120 minutes.";}
 return null;
}
export function staffAssignmentConflict(start:string,end:string,buffer:number,bookings:{startTime:string;endTime:string}[]){return bookings.some(b=>staffMinutes(start)<staffMinutes(b.endTime)+buffer&&staffMinutes(end)+buffer>staffMinutes(b.startTime));}
