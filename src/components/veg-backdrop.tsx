import { VegMark } from "@/components/veg-mark";

const marks = [
  { top: "7%", left: "3%", size: 34, turn: -14, show: "100%" },
  { top: "12%", left: "16%", size: 18, turn: 10 },
  { top: "9%", right: "6%", size: 56, turn: 12, show: "100%" },
  { top: "28%", left: "1%", size: 22, turn: -8 },
  { top: "34%", right: "3%", size: 30, turn: 18 },
  { top: "93%", right: "3%", size: 40, turn: -16, show: "100%", wide: true },
  { top: "52%", right: "11%", size: 16, turn: 6 },
  { top: "64%", left: "2%", size: 26, turn: 14 },
  { top: "71%", right: "4%", size: 48, turn: -10, show: "100%", wide: true },
  { top: "82%", left: "14%", size: 20, turn: -6 },
  { top: "86%", right: "16%", size: 32, turn: 8, show: "100%" },
  { top: "22%", left: "46%", size: 14, turn: 4, wide: true },
] as const;

export function VegBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden text-herb"
    >
      {marks.map((mark) => (
        <span
          key={`${mark.top}-${mark.size}-${mark.turn}`}
          className={
            "absolute opacity-[0.38]" +
            ("wide" in mark && mark.wide ? " hidden sm:block" : "")
          }
          style={{
            top: mark.top,
            left: "left" in mark ? mark.left : undefined,
            right: "right" in mark ? mark.right : undefined,
          }}
        >
          <span
            className="flex items-center gap-1.5"
            style={{ rotate: `${mark.turn}deg` }}
          >
            <span className="block" style={{ width: mark.size, height: mark.size }}>
              <VegMark className="size-full" />
            </span>
            {"show" in mark ? (
              <span
                className="font-display font-bold leading-none tracking-wide"
                style={{ fontSize: Math.max(11, mark.size * 0.34) }}
              >
                {mark.show}
              </span>
            ) : null}
          </span>
        </span>
      ))}
    </div>
  );
}
