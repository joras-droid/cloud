import "server-only";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

export async function getBusinessInquiries() {
  return db
    .select({
      id: s.businessInquiries.id,
      businessName: s.businessInquiries.businessName,
      location: s.businessInquiries.location,
      phone: s.businessInquiries.phone,
      days: s.businessInquiries.days,
      meal: s.businessInquiries.meal,
      headcountRange: s.businessInquiries.headcountRange,
      lunchTime: s.businessInquiries.lunchTime,
      snacksTime: s.businessInquiries.snacksTime,
      createdAt: s.businessInquiries.createdAt,
    })
    .from(s.businessInquiries)
    .orderBy(desc(s.businessInquiries.createdAt));
}
