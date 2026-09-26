import { requireAdmin } from "@/lib/auth/session";
import { getAdminReviews } from "@/server/queries/admin-orders";
import { ReviewCard } from "@/components/admin/review-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  await requireAdmin("manager");
  const reviews = await getAdminReviews();
  const pending = reviews.filter((r) => r.status === "pending");
  const rest = reviews.filter((r) => r.status !== "pending");

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Reviews</h1>
        <p className="mt-1 text-ink-soft">
          New reviews stay in Pending until you approve them. Only approved reviews
          show on the site.
        </p>
      </header>

      {reviews.length === 0 ? (
        <p className="rounded-card border border-dashed border-line p-10 text-center text-ink-soft">
          No reviews yet.
        </p>
      ) : null}

      {pending.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-chilli">
            Waiting on you · {pending.length}
          </h2>
          <ul className="grid gap-4">
            {pending.map((review) => (
              <ReviewCard key={review.id} review={toCard(review)} />
            ))}
          </ul>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            Already decided
          </h2>
          <ul className="grid gap-4">
            {rest.map((review) => (
              <ReviewCard key={review.id} review={toCard(review)} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function toCard(review: Awaited<ReturnType<typeof getAdminReviews>>[number]) {
  return {
    id: review.id,
    rating: review.rating,
    body: review.body,
    status: review.status,
    displayName: review.authorName ?? review.customerName ?? "Guest",
    orderCode: review.orderCode,
    itemName: review.itemName,
    replyEn: review.replyEn,
    replyNe: review.replyNe,
  };
}
