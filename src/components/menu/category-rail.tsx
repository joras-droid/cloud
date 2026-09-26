"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal category jump list. Uses IntersectionObserver rather than scroll
 * maths so highlighting stays accurate and costs nothing on the main thread.
 */
export function CategoryRail({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const [active, setActive] = useState(categories[0]?.slug);

  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(c.slug))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      // Top band only: a section counts as "current" once its heading reaches
      // the upper third of the viewport.
      { rootMargin: "-120px 0px -65% 0px", threshold: 0 },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  return (
    <nav
      aria-label="Menu categories"
      className="no-scrollbar sticky top-16 z-30 -mx-4 flex gap-2 overflow-x-auto bg-cream/90 px-4 py-3 backdrop-blur-md"
    >
      {categories.map((c) => (
        <a
          key={c.slug}
          href={`#${c.slug}`}
          aria-current={active === c.slug ? "true" : undefined}
          className={cn(
            "focus-ring shrink-0 rounded-pill border px-4 py-2 text-sm font-medium transition-colors",
            active === c.slug
              ? "border-ink bg-ink text-cream"
              : "border-line bg-paper text-ink-soft hover:text-ink",
          )}
        >
          {c.name}
        </a>
      ))}
    </nav>
  );
}
