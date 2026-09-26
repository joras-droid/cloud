import { cn } from "@/lib/utils";

export function Label({
  className,
  hint,
  children,
  ...props
}: React.ComponentProps<"label"> & { hint?: string }) {
  return (
    <label
      className={cn("block text-sm font-medium text-ink", className)}
      {...props}
    >
      {children}
      {hint ? (
        <span className="ml-1.5 font-normal text-ink-faint">({hint})</span>
      ) : null}
    </label>
  );
}

const fieldBase =
  "focus-ring w-full rounded-xl border border-line bg-paper px-4 text-[15px] text-ink placeholder:text-ink-faint aria-[invalid=true]:border-chilli";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-12", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea className={cn(fieldBase, "py-3", className)} rows={3} {...props} />
  );
}

export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return <select className={cn(fieldBase, "h-12", className)} {...props} />;
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-chilli">
      {children}
    </p>
  );
}
