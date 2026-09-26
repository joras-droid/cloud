"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { markOwnDelivered, type DeliveredState } from "@/server/actions/track";

function Submit() {
  const t = useTranslations("track");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block disabled={pending}>
      {pending ? t("receiving") : t("received")}
    </Button>
  );
}

export function MarkDelivered({ orderCode }: { orderCode: string }) {
  const [, action] = useActionState<DeliveredState, FormData>(markOwnDelivered, {});

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="orderCode" value={orderCode} />
      <Submit />
    </form>
  );
}
