"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Stars } from "@/components/reviews/review-list";
import {
  deleteReview,
  moderateReview,
  replyToReview,
  updateReview,
} from "@/server/actions/reviews";

export type AdminReviewCardData = {
  id: string;
  rating: number;
  body: string | null;
  status: string;
  displayName: string;
  orderCode: string | null;
  itemName: string | null;
  replyEn: string | null;
  replyNe: string | null;
};

export function ReviewCard({ review }: { review: AdminReviewCardData }) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="rounded-card border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Stars rating={review.rating} />
        <span className="text-sm font-medium">{review.displayName}</span>
        <span className="text-sm text-ink-faint">
          {review.orderCode ?? "No order"}
          {review.itemName ? ` · ${review.itemName}` : ""}
        </span>
        <span className="ml-auto text-xs font-semibold uppercase text-ink-faint">
          {review.status}
        </span>
      </div>
      {review.body ? <p className="mt-3 leading-relaxed">{review.body}</p> : null}

      {editing ? (
        <form action={updateReview} className="mt-4 grid gap-2">
          <input type="hidden" name="id" value={review.id} />
          <Input
            name="authorName"
            defaultValue={review.displayName}
            required
            maxLength={80}
            aria-label="Name"
          />
          <Select name="rating" defaultValue={String(review.rating)} aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
          <Textarea
            name="body"
            defaultValue={review.body ?? ""}
            maxLength={2000}
            placeholder="Review"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Save changes
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {review.status === "pending" ? (
            <>
              <form action={moderateReview}>
                <input type="hidden" name="id" value={review.id} />
                <input type="hidden" name="decision" value="approved" />
                <Button type="submit" size="sm">
                  Approve
                </Button>
              </form>
              <form action={moderateReview}>
                <input type="hidden" name="id" value={review.id} />
                <input type="hidden" name="decision" value="rejected" />
                <Button type="submit" size="sm" variant="danger">
                  Reject
                </Button>
              </form>
            </>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <form
            action={deleteReview}
            onSubmit={(event) => {
              if (!window.confirm("Remove this review?")) event.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={review.id} />
            <Button type="submit" size="sm" variant="danger">
              Remove
            </Button>
          </form>
        </div>
      )}

      {review.status === "approved" && !editing ? (
        <form action={replyToReview} className="mt-4 grid gap-2">
          <input type="hidden" name="reviewId" value={review.id} />
          <Textarea
            name="bodyEn"
            placeholder="Public reply in English"
            defaultValue={review.replyEn ?? ""}
          />
          <Textarea
            name="bodyNe"
            placeholder="Public reply in Nepali (optional)"
            defaultValue={review.replyNe ?? ""}
          />
          <Button type="submit" size="sm" variant="outline">
            {review.replyEn ? "Update reply" : "Post reply"}
          </Button>
        </form>
      ) : null}
    </li>
  );
}
