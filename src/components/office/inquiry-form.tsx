"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Phone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import { VegMark } from "@/components/veg-mark";
import {
  HEADCOUNT_RANGES,
  OFFICE_DAYS,
  type OfficeMeal,
} from "@/lib/office-inquiry";
import { telHref } from "@/lib/phone";
import { cn } from "@/lib/utils";
import {
  submitOfficeInquiry,
  type OfficeInquiryError,
  type OfficeInquiryState,
} from "@/server/actions/office-inquiry";

function SubmitButton() {
  const t = useTranslations("office");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

export function OfficeInquiryForm({
  supportPhone,
}: {
  supportPhone?: string | null;
}) {
  const t = useTranslations("office");
  const brand = useTranslations("brand");
  const [meal, setMeal] = useState<OfficeMeal | "">("");
  const [state, action] = useActionState<OfficeInquiryState, FormData>(
    submitOfficeInquiry,
    {},
  );

  const errors: Record<OfficeInquiryError, string> = {
    invalid: t("invalid"),
    invalid_phone: t("invalidPhone"),
    rate_limited: t("rateLimited"),
  };

  const wantsLunch = meal === "lunch" || meal === "both";
  const wantsSnacks = meal === "snacks" || meal === "both";
  const phone = supportPhone?.trim() ?? "";

  return (
    <div className="grid gap-6">
      <form action={action} className="relative grid gap-5">
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute h-0 w-0 overflow-hidden opacity-0"
        />

        <div className="flex items-start gap-3 rounded-card border border-herb/25 bg-herb-soft p-4 text-herb">
          <VegMark className="mt-0.5 size-5" />
          <p className="text-sm font-medium leading-relaxed">{t("vegetarian")}</p>
        </div>

        {state.ok ? (
          <p className="rounded-card border border-line bg-paper p-5 text-ink">
            {t("thanks")}
          </p>
        ) : (
          <>
            <div>
              <Label htmlFor="office-name">{t("businessName")}</Label>
              <Input
                id="office-name"
                name="businessName"
                required
                maxLength={120}
                autoComplete="organization"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="office-location">{t("location")}</Label>
              <Input
                id="office-location"
                name="location"
                required
                maxLength={200}
                autoComplete="street-address"
                placeholder={t("locationPlaceholder")}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="office-phone">{t("phone")}</Label>
              <Input
                id="office-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel"
                placeholder="98XXXXXXXX"
                className="mt-1.5"
              />
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-ink">{t("days")}</legend>
              <p className="mt-1 text-sm text-ink-soft">{t("daysHint")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {OFFICE_DAYS.map((day) => (
                  <label key={day} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="days"
                      value={day}
                      className="peer sr-only"
                    />
                    <span className="inline-flex h-10 min-w-12 items-center justify-center rounded-full border border-line bg-paper px-3 text-sm font-medium text-ink peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-cream">
                      {t(`day.${day}`)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-ink">{t("meal")}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(["lunch", "snacks", "both"] as const).map((option) => (
                  <label key={option} className="cursor-pointer">
                    <input
                      type="radio"
                      name="meal"
                      value={option}
                      required
                      checked={meal === option}
                      onChange={() => setMeal(option)}
                      className="peer sr-only"
                    />
                    <span className="flex h-12 items-center justify-center rounded-xl border border-line bg-paper px-3 text-sm font-medium text-ink peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-700 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-cream">
                      {t(`meals.${option}`)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="office-people">{t("people")}</Label>
              <Select
                id="office-people"
                name="headcountRange"
                required
                defaultValue=""
                className="mt-1.5"
              >
                <option value="" disabled>
                  {t("peoplePlaceholder")}
                </option>
                {HEADCOUNT_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {t(`ranges.${range}`)}
                  </option>
                ))}
              </Select>
            </div>

            {wantsLunch ? (
              <div>
                <Label htmlFor="office-lunch-time">{t("lunchTime")}</Label>
                <Input
                  id="office-lunch-time"
                  name="lunchTime"
                  type="time"
                  required
                  className="mt-1.5"
                />
              </div>
            ) : null}

            {wantsSnacks ? (
              <div>
                <Label htmlFor="office-snacks-time">{t("snacksTime")}</Label>
                <Input
                  id="office-snacks-time"
                  name="snacksTime"
                  type="time"
                  required
                  className="mt-1.5"
                />
              </div>
            ) : null}

            <FieldError>{state.error ? errors[state.error] : null}</FieldError>
            <SubmitButton />
          </>
        )}
      </form>

      <div className="rounded-card border border-line bg-paper p-5">
        <p className="font-medium text-ink">{t("callTitle")}</p>
        <p className="mt-1 text-sm text-ink-soft">{t("callBody")}</p>
        {phone ? (
          <a
            href={telHref(phone)}
            className={cn(buttonVariants({ variant: "secondary" }), "mt-4")}
          >
            <Phone className="size-4" aria-hidden />
            {t("call", { phone })}
          </a>
        ) : (
          <p className="mt-3 text-sm font-medium text-ink">{brand("name")}</p>
        )}
      </div>
    </div>
  );
}
