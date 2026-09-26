import Image from "next/image";
import { Quote } from "lucide-react";
import { getMenu } from "@/server/queries/menu";
import type { RenderableSection } from "@/server/queries/sections";
import type { BlockPayload } from "@/lib/blocks/schemas";
import type { Locale } from "@/i18n/routing";
import { ItemCard } from "@/components/menu/item-card";
import { cn, pick } from "@/lib/utils";

const THEME: Record<RenderableSection["theme"], string> = {
  light: "bg-paper text-ink",
  warm: "bg-brand-50 text-ink",
  dark: "bg-ink text-cream",
  accent: "bg-herb-soft text-ink",
};

const LAYOUT: Record<RenderableSection["layout"], string> = {
  full_bleed: "grid gap-8",
  split_left: "grid gap-8 lg:grid-cols-2",
  split_right: "grid gap-8 lg:grid-cols-2 lg:[&>*:first-child]:order-last",
  grid_3: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
  carousel:
    "flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory [&>*]:min-w-[80%] sm:[&>*]:min-w-[45%] lg:[&>*]:min-w-[30%] [&>*]:snap-start",
};

/**
 * Renders an admin-authored section. Layout and theme are constrained to these
 * preset maps, which is what keeps a self-serve builder from producing an
 * off-brand page.
 */
export async function SectionRenderer({
  section,
  locale,
}: {
  section: RenderableSection;
  locale: Locale;
}) {
  if (section.blocks.length === 0) return null;

  const title = pick(locale, section.titleEn, section.titleNe);
  const subtitle = pick(locale, section.subtitleEn, section.subtitleNe);
  const isDark = section.theme === "dark";

  return (
    <section className={cn("py-14", THEME[section.theme])}>
      <div className="mx-auto max-w-6xl px-4">
        {title ? (
          <header className="mb-8 max-w-2xl">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              {title}
            </h2>
            {subtitle ? (
              <p
                className={cn(
                  "mt-2 text-lg leading-relaxed",
                  isDark ? "text-cream/70" : "text-ink-soft",
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </header>
        ) : null}

        <div className={LAYOUT[section.layout]}>
          {section.blocks.map((block) => (
            <Block
              key={block.id}
              block={block}
              locale={locale}
              isDark={isDark}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

async function Block({
  block,
  locale,
  isDark,
}: {
  block: BlockPayload & { id: string };
  locale: Locale;
  isDark: boolean;
}) {
  const muted = isDark ? "text-cream/70" : "text-ink-soft";

  switch (block.kind) {
    case "rich_text": {
      const p = block.payload;
      const heading = pick(locale, p.headingEn, p.headingNe);
      return (
        <div className="max-w-prose">
          {heading ? (
            <h3 className="mb-2 font-display text-xl font-bold">{heading}</h3>
          ) : null}
          <p className={cn("whitespace-pre-line leading-relaxed", muted)}>
            {pick(locale, p.bodyEn, p.bodyNe)}
          </p>
        </div>
      );
    }

    case "image": {
      const p = block.payload;
      const caption = pick(locale, p.captionEn, p.captionNe);
      return (
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card">
            <Image
              src={p.media.url}
              alt={pick(locale, p.media.altEn, p.media.altNe)}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          {caption ? (
            <figcaption className={cn("mt-2 text-sm", muted)}>
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
    }

    case "gallery":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {block.payload.items.map((m) => (
            <div
              key={m.mediaId}
              className="relative aspect-square overflow-hidden rounded-xl"
            >
              <Image
                src={m.url}
                alt={pick(locale, m.altEn, m.altNe)}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      );

    case "video": {
      const p = block.payload;
      return (
        <figure>
          <video
            controls
            preload="none"
            poster={p.posterUrl ?? undefined}
            className="w-full rounded-card bg-ink"
          >
            <source src={p.url} />
          </video>
          {pick(locale, p.titleEn, p.titleNe) ? (
            <figcaption className={cn("mt-2 text-sm font-medium", muted)}>
              {pick(locale, p.titleEn, p.titleNe)}
            </figcaption>
          ) : null}
        </figure>
      );
    }

    case "item_carousel": {
      // Read from the live menu rather than the payload so a price edit is
      // reflected here without touching the section.
      const menu = await getMenu();
      const all = new Map(menu.flatMap((c) => c.items).map((i) => [i.id, i]));
      const items = block.payload.itemIds
        .map((id) => all.get(id))
        .filter((i) => i !== undefined);
      if (items.length === 0) return null;
      return (
        <>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </>
      );
    }

    case "stat_strip":
      return (
        <dl className="flex flex-wrap gap-x-10 gap-y-6">
          {block.payload.stats.map((stat) => (
            <div key={stat.labelEn}>
              <dd className="font-display text-3xl font-bold text-brand-600">
                {stat.value}
              </dd>
              <dt className={cn("mt-1 text-sm", muted)}>
                {pick(locale, stat.labelEn, stat.labelNe)}
              </dt>
            </div>
          ))}
        </dl>
      );

    case "quote": {
      const p = block.payload;
      return (
        <blockquote className="max-w-prose">
          <Quote className="mb-3 size-7 text-brand-400" aria-hidden />
          <p className="font-display text-xl leading-relaxed">
            {pick(locale, p.bodyEn, p.bodyNe)}
          </p>
          {p.attribution ? (
            <footer className={cn("mt-3 text-sm", muted)}>
              — {p.attribution}
            </footer>
          ) : null}
        </blockquote>
      );
    }

    case "ingredient_story": {
      const p = block.payload;
      return (
        <article className="flex flex-col gap-4 sm:flex-row">
          {p.media ? (
            <div className="relative size-28 shrink-0 overflow-hidden rounded-card">
              <Image
                src={p.media.url}
                alt={pick(locale, p.media.altEn, p.media.altNe)}
                fill
                sizes="112px"
                className="object-cover"
              />
            </div>
          ) : null}
          <div>
            <h3 className="font-display text-lg font-bold">
              {pick(locale, p.nameEn, p.nameNe)}
            </h3>
            {pick(locale, p.sourceEn, p.sourceNe) ? (
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-herb">
                {pick(locale, p.sourceEn, p.sourceNe)}
              </p>
            ) : null}
            <p className={cn("mt-2 leading-relaxed", muted)}>
              {pick(locale, p.bodyEn, p.bodyNe)}
            </p>
          </div>
        </article>
      );
    }

    case "steps":
      return (
        <ol className="grid gap-6">
          {block.payload.steps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 font-display font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">
                  {pick(locale, step.titleEn, step.titleNe)}
                </h3>
                {pick(locale, step.bodyEn, step.bodyNe) ? (
                  <p className={cn("mt-1 leading-relaxed", muted)}>
                    {pick(locale, step.bodyEn, step.bodyNe)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      );

    case "faq":
      return (
        <div className="max-w-prose divide-y divide-line">
          {block.payload.entries.map((entry, i) => (
            <details key={i} className="group py-4">
              <summary className="focus-ring cursor-pointer list-none rounded font-medium marker:hidden">
                {pick(locale, entry.questionEn, entry.questionNe)}
              </summary>
              <p className={cn("mt-2 leading-relaxed", muted)}>
                {pick(locale, entry.answerEn, entry.answerNe)}
              </p>
            </details>
          ))}
        </div>
      );

    default:
      return null;
  }
}
