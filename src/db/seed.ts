import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import * as s from "./schema";

/** Payment QR placeholders. Dish photos live in /public and are referenced by path. */
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/1200/900`;

type SeedItem = {
  slug: string;
  nameEn: string;
  nameNe: string;
  descEn: string;
  descNe: string;
  price: number;
  isVeg: boolean;
  spice: number;
  prep: number;
  /** File in /public, served as a site path. */
  image: string;
  imageBytes: number;
  variants?: { en: string; ne: string; delta: number; isDefault?: boolean }[];
  remarksEn?: string;
  remarksNe?: string;
};

const CATALOG: {
  slug: string;
  nameEn: string;
  nameNe: string;
  items: SeedItem[];
}[] = [
  {
    slug: "menu",
    nameEn: "Veg Menu",
    nameNe: "भेज मेनु",
    items: [
      {
        slug: "suji-momo",
        nameEn: "Suji Momo",
        nameNe: "सुजी मःम",
        descEn: "",
        descNe: "",
        price: 17000,
        isVeg: true,
        spice: 0,
        prep: 20,
        image: "/momo.png",
        imageBytes: 2465206,
      },
      {
        slug: "pasta",
        nameEn: "Pasta",
        nameNe: "पास्ता",
        descEn: "",
        descNe: "",
        price: 13000,
        isVeg: true,
        spice: 0,
        prep: 20,
        image: "/pasta.png",
        imageBytes: 2777184,
      },
      {
        slug: "suji-roti-sabji",
        nameEn: "Suji Roti Sabji",
        nameNe: "सुजी रोटी सब्जी",
        descEn: "",
        descNe: "",
        price: 15000,
        isVeg: true,
        spice: 0,
        prep: 20,
        image: "/sujikoroti.png",
        imageBytes: 2802907,
      },
      {
        slug: "chatpat-without-chauchau",
        nameEn: "Chatpat (without chauchau)",
        nameNe: "चटपट (चाउचाउ बिना)",
        descEn: "",
        descNe: "",
        price: 7000,
        isVeg: true,
        spice: 0,
        prep: 15,
        image: "/chatpat.png",
        imageBytes: 2656836,
      },
      {
        slug: "fulki",
        nameEn: "Fulki",
        nameNe: "फुल्की",
        descEn: "",
        descNe: "",
        price: 7000,
        isVeg: true,
        spice: 0,
        prep: 15,
        image: "/fulki.png",
        imageBytes: 2714382,
      },
      {
        slug: "veg-fried-rice",
        nameEn: "Veg Fried Rice",
        nameNe: "भेज फ्राइड राइस",
        descEn: "",
        descNe: "",
        price: 16000,
        isVeg: true,
        spice: 0,
        prep: 20,
        image: "/friedrice.png",
        imageBytes: 2651174,
      },
      {
        slug: "veg-biryani",
        nameEn: "Veg Biryani",
        nameNe: "भेज बिरयानी",
        descEn: "",
        descNe: "",
        price: 27000,
        isVeg: true,
        spice: 0,
        prep: 25,
        image: "/vegbiryani.png",
        imageBytes: 2773445,
      },
      {
        slug: "chole-bhature",
        nameEn: "Chole Bhature",
        nameNe: "छोले भटुरे",
        descEn: "",
        descNe: "",
        price: 22000,
        isVeg: true,
        spice: 0,
        prep: 25,
        image: "/chole_bhature.png",
        imageBytes: 2787529,
      },
    ],
  },
];

const ZONES = [
  { en: "Kathmandu", ne: "काठमाडौं", fee: 8000 },
  { en: "Lalitpur", ne: "ललितपुर", fee: 15000 },
];

async function seed() {
  console.log("Seeding…");

  // Idempotent: wipe in FK-safe order so the script can be re-run freely.
  await db.delete(s.businessInquiries);
  await db.delete(s.blocks);
  await db.delete(s.sections);
  await db.delete(s.reviewReplies);
  await db.delete(s.reviewMedia);
  await db.delete(s.reviews);
  await db.delete(s.deliveries);
  await db.delete(s.payments);
  await db.delete(s.orderEvents);
  await db.delete(s.orderItems);
  await db.delete(s.orders);
  await db.delete(s.customers);
  await db.delete(s.deliveryZones);
  await db.delete(s.itemMedia);
  await db.delete(s.itemModifierGroups);
  await db.delete(s.itemVariants);
  await db.delete(s.modifiers);
  await db.delete(s.modifierGroups);
  await db.delete(s.menuItems);
  await db.delete(s.categories);
  await db.delete(s.media);
  await db.delete(s.storeSettings);
  await db.delete(s.auditLog);
  await db.delete(s.adminUsers);

  const [owner] = await db
    .insert(s.adminUsers)
    .values({
      email: "owner@gharkoswad.com",
      name: "Kitchen Owner",
      passwordHash: await bcrypt.hash("changeme123", 12),
      role: "owner",
    })
    .returning();

  const [dietGroup] = await db
    .insert(s.modifierGroups)
    .values({
      nameEn: "Onion & garlic",
      nameNe: "प्याज र लसुन",
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
    })
    .returning();

  await db.insert(s.modifiers).values([
    {
      groupId: dietGroup.id,
      nameEn: "Include onion & garlic",
      nameNe: "प्याज र लसुन राख्नुहोस्",
      sortOrder: 0,
    },
    {
      groupId: dietGroup.id,
      nameEn: "No onion",
      nameNe: "प्याज नराख्नुहोस्",
      sortOrder: 1,
    },
    {
      groupId: dietGroup.id,
      nameEn: "No garlic",
      nameNe: "लसुन नराख्नुहोस्",
      sortOrder: 2,
    },
    {
      groupId: dietGroup.id,
      nameEn: "No onion, no garlic",
      nameNe: "प्याज र लसुन नराख्नुहोस्",
      sortOrder: 3,
    },
  ]);

  const seededItems: {
    id: string;
    nameEn: string;
    nameNe: string | null;
    price: number;
  }[] = [];

  let categorySort = 0;
  for (const cat of CATALOG) {
    const [category] = await db
      .insert(s.categories)
      .values({
        slug: cat.slug,
        nameEn: cat.nameEn,
        nameNe: cat.nameNe,
        sortOrder: categorySort++,
      })
      .returning();

    let itemSort = 0;
    for (const item of cat.items) {
      const [hero] = await db
        .insert(s.media)
        .values({
          kind: "image",
          r2Key: item.image,
          mime: "image/png",
          bytes: item.imageBytes,
          width: 1254,
          height: 1254,
          altEn: item.nameEn,
          altNe: item.nameNe,
          fileHash: `seed-${item.slug}`,
          uploadedBy: owner.id,
        })
        .returning();

      const [row] = await db
        .insert(s.menuItems)
        .values({
          slug: item.slug,
          categoryId: category.id,
          nameEn: item.nameEn,
          nameNe: item.nameNe,
          descEn: item.descEn,
          descNe: item.descNe,
          remarksEn: item.remarksEn,
          remarksNe: item.remarksNe,
          basePrice: item.price,
          isVeg: item.isVeg,
          spiceLevel: item.spice,
          prepMinutes: item.prep,
          status: "published",
          sortOrder: itemSort++,
          heroMediaId: hero.id,
        })
        .returning();

      await db.insert(s.itemMedia).values({
        itemId: row.id,
        mediaId: hero.id,
        role: "gallery",
        sortOrder: 0,
      });

      if (item.variants) {
        await db.insert(s.itemVariants).values(
          item.variants.map((v, i) => ({
            itemId: row.id,
            labelEn: v.en,
            labelNe: v.ne,
            priceDelta: v.delta,
            isDefault: v.isDefault ?? false,
            sortOrder: i,
          })),
        );
      }

      seededItems.push({
        id: row.id,
        nameEn: item.nameEn,
        nameNe: item.nameNe,
        price: item.price,
      });

      await db.insert(s.itemModifierGroups).values({
        itemId: row.id,
        groupId: dietGroup.id,
        sortOrder: 0,
      });
    }
  }

  await db.insert(s.deliveryZones).values(
    ZONES.map((z, i) => ({
      nameEn: z.en,
      nameNe: z.ne,
      fee: z.fee,
      codAllowed: true,
      sortOrder: i,
    })),
  );

  await db.insert(s.storeSettings).values({
    isAcceptingOrders: true,
    openHours: [
      { day: 0, open: "10:00", close: "21:00", closed: false },
      { day: 1, open: "10:00", close: "21:00", closed: false },
      { day: 2, open: "10:00", close: "21:00", closed: false },
      { day: 3, open: "10:00", close: "21:00", closed: false },
      { day: 4, open: "10:00", close: "21:30", closed: false },
      { day: 5, open: "10:00", close: "21:30", closed: false },
      { day: 6, open: "10:00", close: "21:00", closed: false },
    ],
    minOrder: 30000,
    codEnabled: true,
    codMax: 300000,
    prepayEnabled: true,
    qrImages: [
      {
        method: "fonepay",
        accountName: "Ghar Ko Swad Pvt. Ltd.",
        image: photo("fonepay-qr"),
      },
      {
        method: "esewa",
        accountName: "9800000000",
        image: photo("esewa-qr"),
      },
    ],
    supportPhone: "9847104744",
    bannerEn: "Free delivery on orders above Rs 1,000",
    bannerNe: "रु १,००० माथिको अर्डरमा डेलिभरी नि:शुल्क",
  });

  const [zone] = await db.select().from(s.deliveryZones).limit(1);
  const momo = seededItems.find((i) => i.nameEn === "Suji Momo");
  const thali = seededItems.find((i) => i.nameEn === "Veg Biryani");
  if (zone && momo && thali) {
    const [customer] = await db
      .insert(s.customers)
      .values({
        phone: "9801111111",
        name: "Anisha Sharma",
        phoneVerifiedAt: new Date(),
      })
      .returning();

    const [qrOrder] = await db
      .insert(s.orders)
      .values({
        orderCode: "GKS-4F7Q",
        customerId: customer.id,
        status: "payment_submitted",
        paymentMethod: "fonepay",
        zoneId: zone.id,
        addressLine: "House 12, near the temple",
        landmark: "Opposite the dairy",
        locale: "en",
        subtotal: momo.price,
        deliveryFee: zone.fee,
        total: momo.price + zone.fee,
      })
      .returning();

    await db.insert(s.orderItems).values({
      orderId: qrOrder.id,
      itemId: momo.id,
      nameEnSnapshot: momo.nameEn,
      nameNeSnapshot: momo.nameNe,
      unitPriceSnapshot: momo.price,
      qty: 1,
      modifiersSnapshot: [{ nameEn: "Include onion & garlic" }],
      lineTotal: momo.price,
    });

    const [shot] = await db
      .insert(s.media)
      .values({
        kind: "image",
        r2Key: photo("payment-screenshot"),
        mime: "image/jpeg",
        bytes: 0,
        width: 800,
        height: 1200,
        altEn: "Payment screenshot",
        fileHash: "seed-payment-screenshot",
      })
      .returning();

    await db.insert(s.payments).values({
      orderId: qrOrder.id,
      method: "fonepay",
      amount: qrOrder.total,
      screenshotMediaId: shot.id,
      payerName: "Anisha Sharma",
      payerPhone: "9801111111",
      status: "submitted",
    });

    const [codOrder] = await db
      .insert(s.orders)
      .values({
        orderCode: "GKS-9K2M",
        customerId: customer.id,
        status: "pending_confirmation",
        paymentMethod: "cod",
        zoneId: zone.id,
        addressLine: "Third floor, blue gate",
        landmark: "Next to the pharmacy",
        locale: "ne",
        subtotal: thali.price,
        deliveryFee: zone.fee,
        total: thali.price + zone.fee,
      })
      .returning();

    await db.insert(s.orderItems).values({
      orderId: codOrder.id,
      itemId: thali.id,
      nameEnSnapshot: thali.nameEn,
      nameNeSnapshot: thali.nameNe,
      unitPriceSnapshot: thali.price,
      qty: 1,
      modifiersSnapshot: [{ nameEn: "No onion, no garlic" }],
      lineTotal: thali.price,
    });

    const [doneOrder] = await db
      .insert(s.orders)
      .values({
        orderCode: "GKS-1A8C",
        customerId: customer.id,
        status: "delivered",
        paymentMethod: "fonepay",
        zoneId: zone.id,
        addressLine: "House 12, near the temple",
        landmark: "Opposite the dairy",
        locale: "en",
        subtotal: momo.price,
        deliveryFee: zone.fee,
        total: momo.price + zone.fee,
      })
      .returning();

    await db.insert(s.orderItems).values({
      orderId: doneOrder.id,
      itemId: momo.id,
      nameEnSnapshot: momo.nameEn,
      nameNeSnapshot: momo.nameNe,
      unitPriceSnapshot: momo.price,
      qty: 2,
      lineTotal: momo.price * 2,
    });

    await db.insert(s.reviews).values({
      orderId: doneOrder.id,
      itemId: momo.id,
      customerId: customer.id,
      rating: 5,
      body: "Tasted exactly like home. We will order the suji momo again.",
      status: "pending",
    });
  }

  await db.insert(s.sections).values({
    slug: "how-we-cook",
    titleEn: "How a plate is made",
    titleNe: "एक थाली कसरी बन्छ",
    subtitleEn: "Nothing is cooked until you order it.",
    subtitleNe: "अर्डर नआउन्जेल केही पकाइँदैन।",
    layout: "full_bleed",
    theme: "light",
    pageScope: "story",
    sortOrder: 0,
    isPublished: true,
    publishedAt: new Date(),
  });

  console.log("Seeded. Admin login: owner@gharkoswad.com / changeme123");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
