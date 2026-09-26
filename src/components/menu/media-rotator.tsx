"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type RotatorSlide = {
  url: string;
  kind: "image" | "video";
};

const PHOTO_MS = 4500;

/**
 * Starts on the slide the admin marked to show first, then slides through the
 * rest. Photos hold for a few seconds. A video plays muted to the end, then
 * the next slide comes in. There is no control to turn sound on.
 */
export function MediaRotator({
  slides,
  alt,
  sizes,
  priority = false,
}: {
  slides: RotatorSlide[];
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = slides.length === 0 ? 0 : index % slides.length;
  const slide = slides[safeIndex];

  useEffect(() => {
    if (slides.length < 2 || !slide) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Photos wait, then slide. A video moves on when it ends; this is only a
    // backstop if the browser never fires `ended`.
    const ms = slide.kind === "video" ? 30_000 : PHOTO_MS;
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
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="flex h-full transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${safeIndex * 100}%)` }}
      >
        {slides.map((item, i) => {
          const active = i === safeIndex;
          return (
            <div
              key={`${item.url}-${i}`}
              className="relative h-full w-full shrink-0"
              aria-hidden={!active}
            >
              {item.kind === "video" ? (
                <video
                  key={item.url}
                  src={item.url}
                  muted
                  defaultMuted
                  playsInline
                  autoPlay={active}
                  loop={slides.length === 1}
                  controls={false}
                  disablePictureInPicture
                  controlsList="nodownload nofullscreen noplaybackrate noremoteplayback"
                  preload={active ? "auto" : "metadata"}
                  onEnded={active ? advance : undefined}
                  onError={active ? advance : undefined}
                  ref={(node) => {
                    if (!node) return;
                    node.muted = true;
                    node.defaultMuted = true;
                    node.volume = 0;
                    if (active) void node.play().catch(() => {});
                    else node.pause();
                  }}
                  className="pointer-events-none absolute inset-0 size-full object-cover"
                />
              ) : (
                <Image
                  src={item.url}
                  alt={active ? alt : ""}
                  fill
                  priority={priority && i === 0}
                  sizes={sizes}
                  className="pointer-events-none object-cover"
                />
              )}
            </div>
          );
        })}
      </div>
      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1">
          {slides.map((item, i) => (
            <button
              key={`${item.url}-dot-${i}`}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === safeIndex}
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
    </div>
  );
}
