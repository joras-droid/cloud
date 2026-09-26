"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import {
  deleteModifierGroup,
  saveModifierGroup,
  type OptionFormState,
} from "@/server/actions/menu";
import type { AdminModifierGroup } from "@/server/queries/admin-menu";
import { paisaToRupees } from "@/lib/money";

type Choice = {
  nameEn: string;
  nameNe: string;
  priceDeltaRupees: number;
  isAvailable: boolean;
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save group"}
    </Button>
  );
}

export function OptionGroupEditor({ group }: { group?: AdminModifierGroup }) {
  const [state, action] = useActionState<OptionFormState, FormData>(
    saveModifierGroup,
    {},
  );
  const [choices, setChoices] = useState<Choice[]>(
    group?.modifiers.map((m) => ({
      nameEn: m.nameEn,
      nameNe: m.nameNe ?? "",
      priceDeltaRupees: paisaToRupees(m.priceDelta),
      isAvailable: m.isAvailable,
    })) ?? [
      { nameEn: "", nameNe: "", priceDeltaRupees: 0, isAvailable: true },
    ],
  );

  return (
    <form
      action={action}
      className="grid gap-4 rounded-card border border-line bg-paper p-5"
    >
      {group ? <input type="hidden" name="id" value={group.id} /> : null}
      <input type="hidden" name="choices" value={JSON.stringify(choices)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`nameEn-${group?.id ?? "new"}`}>Group name (English)</Label>
          <Input
            id={`nameEn-${group?.id ?? "new"}`}
            name="nameEn"
            required
            defaultValue={group?.nameEn}
            placeholder="Onion & garlic"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor={`nameNe-${group?.id ?? "new"}`}>Group name (Nepali)</Label>
          <Input
            id={`nameNe-${group?.id ?? "new"}`}
            name="nameNe"
            defaultValue={group?.nameNe ?? ""}
            placeholder="प्याज र लसुन"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isRequired"
            defaultChecked={group?.isRequired ?? true}
            className="size-4 accent-brand-600"
          />
          Required on the storefront
        </label>
        <label className="flex items-center gap-2">
          Min
          <Input
            name="minSelect"
            type="number"
            min={0}
            defaultValue={group?.minSelect ?? 1}
            className="h-9 w-16"
          />
        </label>
        <label className="flex items-center gap-2">
          Max
          <Input
            name="maxSelect"
            type="number"
            min={1}
            defaultValue={group?.maxSelect ?? 1}
            className="h-9 w-16"
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Choices the customer sees</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setChoices((c) => [
                ...c,
                { nameEn: "", nameNe: "", priceDeltaRupees: 0, isAvailable: true },
              ])
            }
          >
            <Plus className="size-4" />
            Add choice
          </Button>
        </div>
        <ul className="grid gap-2">
          {choices.map((choice, i) => (
            <li key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_6rem_auto_auto]">
              <Input
                placeholder="Include onion & garlic"
                value={choice.nameEn}
                onChange={(e) =>
                  setChoices((rows) =>
                    rows.map((r, n) => (n === i ? { ...r, nameEn: e.target.value } : r)),
                  )
                }
              />
              <Input
                placeholder="प्याज र लसुन राख्नुहोस्"
                value={choice.nameNe}
                onChange={(e) =>
                  setChoices((rows) =>
                    rows.map((r, n) => (n === i ? { ...r, nameNe: e.target.value } : r)),
                  )
                }
              />
              <Input
                type="number"
                aria-label="Price delta in rupees"
                value={choice.priceDeltaRupees}
                onChange={(e) =>
                  setChoices((rows) =>
                    rows.map((r, n) =>
                      n === i ? { ...r, priceDeltaRupees: Number(e.target.value) } : r,
                    ),
                  )
                }
              />
              <label className="text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={choice.isAvailable}
                  onChange={(e) =>
                    setChoices((rows) =>
                      rows.map((r, n) =>
                        n === i ? { ...r, isAvailable: e.target.checked } : r,
                      ),
                    )
                  }
                />{" "}
                On
              </label>
              <button
                type="button"
                onClick={() => setChoices((rows) => rows.filter((_, n) => n !== i))}
                className="grid size-9 place-items-center rounded-full text-ink-faint hover:bg-chilli-soft hover:text-chilli"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <FieldError>{state.error}</FieldError>
      <div className="flex gap-3">
        <Submit />
        {group ? (
          <button
            type="submit"
            formAction={deleteModifierGroup}
            className="text-sm font-medium text-chilli"
            onClick={(e) => {
              if (!confirm("Remove this option group from every dish?")) {
                e.preventDefault();
              }
            }}
          >
            Delete group
          </button>
        ) : null}
      </div>
    </form>
  );
}
