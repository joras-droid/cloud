import { setKitchenOpen } from "@/server/actions/content";
import { cn } from "@/lib/utils";

export function KitchenToggle({ open }: { open: boolean }) {
  return (
    <form
      action={setKitchenOpen}
      className="mb-6 flex items-center justify-between gap-4 rounded-card border border-line bg-paper px-4 py-3"
    >
      <div>
        <p className="text-sm font-semibold text-ink">
          {open ? "Kitchen open" : "Kitchen closed"}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {open
            ? "Customers can place orders. New ones show up on Orders."
            : "New orders are paused until you open the kitchen."}
        </p>
      </div>
      <input type="hidden" name="open" value={open ? "false" : "true"} />
      <button
        type="submit"
        role="switch"
        aria-checked={open}
        aria-label={open ? "Close kitchen" : "Open kitchen"}
        className={cn(
          "focus-ring relative h-7 w-12 shrink-0 rounded-full transition-colors",
          open ? "bg-herb" : "bg-ink-faint",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform",
            open ? "left-5" : "left-0.5",
          )}
        />
      </button>
    </form>
  );
}
