"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { MenuMediaEditor } from "@/components/admin/menu-media-editor";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { saveMenuItem, deleteMenuItem, type ItemFormState } from "@/server/actions/menu";
import type { AdminCategory, AdminItemDetail } from "@/server/queries/admin-menu";
import { paisaToRupees } from "@/lib/money";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function ItemEditor({
  item,
  categories,
}: {
  item: AdminItemDetail | null;
  categories: AdminCategory[];
}) {
  const [state, action] = useActionState<ItemFormState, FormData>(saveMenuItem, {});

  return (
    <div className="grid max-w-3xl gap-8">
    <form action={action} className="grid gap-8">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <input type="hidden" name="spiceLevel" value={item?.spiceLevel ?? 0} />

      <section className="grid gap-4 rounded-card border border-line bg-paper p-5">
        <h2 className="font-display text-lg font-bold">Dish</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="nameEn">Name (English)</Label>
            <Input
              id="nameEn"
              name="nameEn"
              required
              defaultValue={item?.nameEn}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="nameNe" hint="optional">
              Name (Nepali)
            </Label>
            <Input
              id="nameNe"
              name="nameNe"
              defaultValue={item?.nameNe ?? ""}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="descEn">Description (English)</Label>
            <Textarea
              id="descEn"
              name="descEn"
              defaultValue={item?.descEn ?? ""}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="descNe" hint="optional">
              Description (Nepali)
            </Label>
            <Textarea
              id="descNe"
              name="descNe"
              defaultValue={item?.descNe ?? ""}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select
              id="categoryId"
              name="categoryId"
              required
              defaultValue={item?.categoryId ?? categories[0]?.id}
              className="mt-1.5"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-card border border-line bg-paper p-5">
        <h2 className="font-display text-lg font-bold">Price & kitchen</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="basePrice">Price (Rs)</Label>
            <Input
              id="basePrice"
              name="basePrice"
              type="number"
              min={1}
              step="1"
              required
              defaultValue={item ? paisaToRupees(item.basePrice) : 200}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              defaultValue={item?.status ?? "published"}
              className="mt-1.5"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="sold_out">Sold out</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
            <input
              type="checkbox"
              name="isVeg"
              defaultChecked={item?.isVeg}
              className="size-4 accent-herb"
            />
            Vegetarian
          </label>
        </div>
      </section>

      <section className="grid gap-4 rounded-card border border-line bg-paper p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Onion & garlic</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Turn this on if the customer should be able to ask for no onion or
            no garlic. Leave it off for drinks and desserts.
          </p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
          <input
            type="checkbox"
            name="onionGarlic"
            defaultChecked={item?.onionGarlicEnabled ?? true}
            className="mt-0.5 size-4 accent-brand-600"
          />
          <span>
            <span className="block font-medium text-ink">
              Offer onion / garlic choice
            </span>
            <span className="mt-0.5 block text-sm text-ink-soft">
              Customer can pick: include both, no onion, no garlic, or neither.
            </span>
          </span>
        </label>
      </section>

      <section className="grid gap-4 rounded-card border border-line bg-paper p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Remarks</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Extra note shown on the dish — serving tip, spice warning, or
            anything the kitchen wants the customer to read.
          </p>
        </div>
        <div>
          <Label htmlFor="remarksEn">Remarks (English)</Label>
          <Textarea
            id="remarksEn"
            name="remarksEn"
            defaultValue={item?.remarksEn ?? ""}
            className="mt-1.5"
            placeholder="Served with roasted tomato achar. Ask for extra if you like it sharp."
          />
        </div>
        <div>
          <Label htmlFor="remarksNe" hint="optional">
            Remarks (Nepali)
          </Label>
          <Textarea
            id="remarksNe"
            name="remarksNe"
            defaultValue={item?.remarksNe ?? ""}
            className="mt-1.5"
          />
        </div>
      </section>

      <FieldError>{state.error}</FieldError>

      <div className="flex flex-wrap items-center gap-3">
        <Submit label={item ? "Save dish" : "Create dish"} />
        {item ? (
          <button
            type="submit"
            formAction={deleteMenuItem}
            formNoValidate
            className="focus-ring rounded-xl px-4 py-2.5 text-sm font-medium text-chilli hover:bg-chilli-soft"
            onClick={(e) => {
              if (!confirm("Hide this dish from the menu? Past orders keep it.")) {
                e.preventDefault();
              }
            }}
          >
            Remove from menu
          </button>
        ) : null}
      </div>
    </form>

    {item ? (
      <MenuMediaEditor itemId={item.id} media={item.media} />
    ) : (
      <section className="rounded-card border border-dashed border-line bg-paper p-5">
        <h2 className="font-display text-lg font-bold">Photos & video</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Save the dish first, then you can add photos and a video. Pick which
          one shows first. The rest rotate on the menu.
        </p>
      </section>
    )}
    </div>
  );
}
