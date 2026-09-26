"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type RotatorSlide = {
  url: string;
  kind: "image" | "video";
};

/**
 * Starts on the slide the admin marked to show first, then advances through
 * the rest. Photos wait a few seconds; a video plays, then the next slide.
 */
export function MediaRotator({
  slides,
  alt,
  sizes,
  priority = false,
  interactive = false,
}: {
  slides: RotatorSlide[];
  alt: string;
  sizes: string;
  priority?: boolean;
  interactive?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = slides.length === 0 ? 0 : index % slides.length;
  const slide = slides[safeIndex];

  useEffect(() => {
    if (slides.length < 2 || !slide) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ms = slide.kind === "video" ? 8000 : 4000;
    const id = window.setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, ms);
    return () => window.clearTimeout(id);
  }, [safeIndex, slide, slides.length]);

  if (!slide) return null;

  const advance = () => {
    if (slides.length < 2) return;
    setIndex((current) => (current + 1) % slides.length);
  };

  return (
    <>
      {slide.kind === "video" ? (
        <video
          key={slide.url}
          src={slide.url}
          muted
          playsInline
          autoPlay
          loop={slides.length === 1}
          controls={interactive}
          onEnded={advance}
          onError={advance}
          className={cn(
            "absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105",
            !interactive && "pointer-events-none",
          )}
        />
      ) : (
        <Image
          key={slide.url}
          src={slide.url}
          alt={alt}
          fill
          priority={priority && safeIndex === 0}
          sizes={sizes}
          className={cn(
            "object-cover transition-transform duration-300 group-hover:scale-105",
            !interactive && "pointer-events-none",
          )}
        />
      )}
      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1">
          {slides.map((item, i) => (
            <button
              key={`${item.url}-${i}`}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              className={cn(
                "size-1.5 rounded-full",
                i === safeIndex ? "bg-white" : "bg-white/55",
              )}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIndex(i);
              }}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
