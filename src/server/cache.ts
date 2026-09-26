import { revalidatePath, revalidateTag, updateTag } from "next/cache";

export function publishMenu() {
  revalidateTag("menu", "max");
  revalidatePath("/admin/menu");
  revalidatePath("/admin/options");
}

export function publishSettings() {
  // Expire immediately so checkout stops offering a payment method the
  // kitchen just turned off, instead of serving the cached settings once more.
  updateTag("settings");
  revalidateTag("zones", "max");
  revalidatePath("/admin/settings");
}

export function publishSections() {
  revalidateTag("sections", "max");
  revalidatePath("/admin/sections");
}

export function publishReviews() {
  // updateTag expires the cache before this action re-renders the page, so the
  // review the customer just sent is in the list they are looking at.
  updateTag("reviews");
  revalidatePath("/admin/reviews");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/item/[slug]", "page");
}

export function publishOrders() {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
}
