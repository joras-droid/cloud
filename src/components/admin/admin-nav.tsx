"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  ClipboardList,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  MessageSquare,
  Settings,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavBadges = {
  orders: number;
  reviews: number;
};

/**
 * The nav owns its own icons. Component functions can't cross the server/client
 * boundary as props, so the server passes plain numbers and nothing else.
 */
const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, badge: "orders" },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/sections", label: "Sections", icon: LayoutTemplate },
  {
    href: "/admin/reviews",
    label: "Reviews",
    icon: MessageSquare,
    badge: "reviews",
  },
  { href: "/admin/inquiries", label: "Business inquiry", icon: Briefcase },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminNav({ badges }: { badges: NavBadges }) {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
      {LINKS.map((link) => {
        const Icon = link.icon;
        const count = "badge" in link ? badges[link.badge] : 0;
        // Exact match for the dashboard root, prefix match elsewhere, so
        // /admin doesn't stay highlighted on every sub-page.
        const active =
          link.href === "/admin"
            ? pathname === link.href
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-50 text-brand-700"
                : "text-ink-soft hover:bg-brand-50/60 hover:text-ink",
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            {link.label}
            {count > 0 ? (
              <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-chilli px-1.5 text-[11px] font-bold text-white tabular-nums">
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
