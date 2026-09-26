/** The only cities the kitchen delivers to. Kathmandu is the form default. */
export const CHECKOUT_CITY_NAMES = ["Kathmandu", "Lalitpur"] as const;

export type CheckoutCityName = (typeof CHECKOUT_CITY_NAMES)[number];
