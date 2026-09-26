import { Phone } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import {
  formatClockTime,
  formatOfficeDays,
  HEADCOUNT_LABELS,
  isHeadcountRange,
  MEAL_LABELS,
} from "@/lib/office-inquiry";
import { telHref } from "@/lib/phone";
import { getBusinessInquiries } from "@/server/queries/admin-inquiries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business inquiry" };

const when = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function BusinessInquiriesPage() {
  await requireAdmin();
  const inquiries = await getBusinessInquiries();

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">
          Business inquiry
        </h1>
        <p className="mt-1 text-ink-soft">
          Offices and other regular businesses asking for a quotation. These
          are not orders — call them back with a price.
        </p>
      </header>

      {inquiries.length === 0 ? (
        <p className="rounded-card border border-dashed border-line p-10 text-center text-ink-soft">
          No business inquiries yet.
        </p>
      ) : (
        <ul className="grid gap-4">
          {inquiries.map((inquiry) => {
            const people = isHeadcountRange(inquiry.headcountRange)
              ? HEADCOUNT_LABELS[inquiry.headcountRange]
              : inquiry.headcountRange;
            return (
              <li
                key={inquiry.id}
                className="rounded-card border border-line bg-paper p-5 shadow-card"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-ink">
                    {inquiry.businessName}
                  </h2>
                  <time
                    dateTime={inquiry.createdAt.toISOString()}
                    className="text-xs text-ink-faint"
                  >
                    {when.format(inquiry.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{inquiry.location}</p>
                <a
                  href={telHref(inquiry.phone)}
                  className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded text-sm font-medium text-brand-700"
                >
                  <Phone className="size-3.5" aria-hidden />
                  {inquiry.phone}
                </a>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-ink-faint">Days</dt>
                    <dd className="font-medium text-ink">
                      {formatOfficeDays(inquiry.days)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">Meal</dt>
                    <dd className="font-medium text-ink">
                      {MEAL_LABELS[inquiry.meal]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">People</dt>
                    <dd className="font-medium text-ink">{people}</dd>
                  </div>
                  {inquiry.lunchTime ? (
                    <div>
                      <dt className="text-ink-faint">Lunch delivery</dt>
                      <dd className="font-medium text-ink">
                        {formatClockTime(inquiry.lunchTime)}
                      </dd>
                    </div>
                  ) : null}
                  {inquiry.snacksTime ? (
                    <div>
                      <dt className="text-ink-faint">Snacks delivery</dt>
                      <dd className="font-medium text-ink">
                        {formatClockTime(inquiry.snacksTime)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
