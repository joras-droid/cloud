"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { dispatchYango, type RiderFormState } from "@/server/actions/orders";

function SaveButton({ saved }: { saved: boolean }) {
  const { pending } = useFormStatus();
  const showSaved = saved && !pending;

  return (
    <Button
      type="submit"
      block
      variant="outline"
      className={cn(
        showSaved &&
          "animate-saved border-transparent bg-herb text-white hover:bg-herb",
      )}
    >
      {pending ? "Saving…" : showSaved ? "Saved" : "Save phone"}
    </Button>
  );
}

export function RiderForm({
  orderId,
  phone,
  yangoRef,
}: {
  orderId: string;
  phone: string;
  yangoRef: string;
}) {
  const [state, action] = useActionState<RiderFormState, FormData>(
    dispatchYango,
    {},
  );

  return (
    <form action={action} className="grid gap-3 rounded-card border border-line bg-paper p-4">
      <div>
        <h3 className="font-semibold">Rider</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Save the phone for this delivery. Saving again updates that number,
          including on earlier orders for the same rider. The order is marked on
          the way.
        </p>
      </div>
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <Label htmlFor="riderPhone">Rider phone</Label>
        <Input
          id="riderPhone"
          name="riderPhone"
          type="tel"
          inputMode="tel"
          required
          defaultValue={phone}
          placeholder="9800000000"
          className="mt-1.5"
          aria-invalid={state.error ? true : undefined}
        />
        <FieldError>{state.error}</FieldError>
      </div>
      <div>
        <Label htmlFor="yangoRef" hint="optional">
          Yango reference
        </Label>
        <Input
          id="yangoRef"
          name="yangoRef"
          defaultValue={yangoRef}
          className="mt-1.5"
        />
      </div>
      <SaveButton key={state.at ?? 0} saved={state.ok === true} />
    </form>
  );
}
