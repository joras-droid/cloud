import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import * as s from "./schema";

/**
 * Placeholder imagery until real food photography exists. It flows through the
 * same media table and resolver as production assets, so the image path is
 * exercised from day one rather than discovered broken at launch.
 */
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
  variants?: { en: string; ne: string; delta: number; isDefault?: boolean }[];
  groups?: ("spice" | "addons")[];
};

const CATALOG: {
  slug: string;
  nameEn: string;
  nameNe: string;
  items: SeedItem[];
}[] = [
  {
    slug: "momo",
    nameEn: "Momo",
    nameNe: "मःम",
    items: [
      {
        slug: "chicken-steam-momo",
        nameEn: "Chicken Steam Momo",
        nameNe: "कुखुराको स्टिम मःम",
        descEn:
          "Hand-folded dumplings with free-range chicken, ginger and spring onion. Steamed to order and served with our roasted tomato achar.",
        descNe:
          "हातले बनाइएको मःम, खुला चरनको कुखुरा, अदुवा र हरियो प्याजसहित। अर्डर पछि भाप हालेर पोलेको गोलभेँडाको अचारसँग।",
        price: 28000,
        isVeg: false,
        spice: 1,
        prep: 20,
        variants: [
          { en: "6 pieces", ne: "६ वटा", delta: 0, isDefault: true },
          { en: "10 pieces", ne: "१० वटा", delta: 14000 },
        ],
        groups: ["spice", "addons"],
      },
      {
        slug: "buff-momo",
        nameEn: "Buff Momo",
        nameNe: "राँगाको मःम",
        descEn:
          "The Kathmandu classic. Buffalo mince with timur, cumin and garlic, wrapped thin and steamed.",
        descNe:
          "काठमाडौंको क्लासिक। टिमुर, जिरा र लसुनसहितको राँगाको किमा, पातलो बेरेर भाप हालिएको।",
        price: 26000,
        isVeg: false,
        spice: 2,
        prep: 20,
        variants: [
          { en: "6 pieces", ne: "६ वटा", delta: 0, isDefault: true },
          { en: "10 pieces", ne: "१० वटा", delta: 13000 },
        ],
        groups: ["spice", "addons"],
      },
      {
        slug: "veg-momo",
        nameEn: "Veg Momo",
        nameNe: "तरकारीको मःम",
        descEn:
          "Cabbage, carrot, mushroom and paneer with a touch of sesame. Lighter than it sounds.",
        descNe:
          "बन्दा, गाजर, च्याउ र पनिर, अलिकति तिलसहित। सुन्दा भन्दा हल्का।",
        price: 24000,
        isVeg: true,
        spice: 1,
        prep: 18,
        variants: [
          { en: "6 pieces", ne: "६ वटा", delta: 0, isDefault: true },
          { en: "10 pieces", ne: "१० वटा", delta: 12000 },
        ],
        groups: ["spice", "addons"],
      },
      {
        slug: "jhol-momo",
        nameEn: "Jhol Momo",
        nameNe: "झोल मःम",
        descEn:
          "Steamed momo swimming in a tangy sesame-tomato broth. Order extra napkins.",
        descNe:
          "भापे मःम अमिलो तिल-गोलभेँडाको झोलमा। थप रुमाल मगाउनुहोला।",
        price: 32000,
        isVeg: false,
        spice: 3,
        prep: 22,
        groups: ["spice"],
      },
      {
        slug: "chilli-momo",
        nameEn: "Chilli Momo",
        nameNe: "चिल्ली मःम",
        descEn:
          "Fried momo tossed with capsicum, onion and a dark chilli glaze.",
        descNe: "तारेको मःम, खुर्सानी, प्याज र कालो चिल्ली ग्लेजसँग भुटेको।",
        price: 34000,
        isVeg: false,
        spice: 3,
        prep: 25,
        groups: ["spice"],
      },
    ],
  },
  {
    slug: "thali-and-rice",
    nameEn: "Thali & Rice",
    nameNe: "थाली र भात",
    items: [
      {
        slug: "nepali-veg-thali",
        nameEn: "Nepali Veg Thali",
        nameNe: "नेपाली शाकाहारी थाली",
        descEn:
          "Rice, black dal, seasonal tarkari, saag, achar and papad. The plate we eat at home.",
        descNe:
          "भात, कालो दाल, मौसमी तरकारी, साग, अचार र पापड। हामी घरमै खाने थाली।",
        price: 38000,
        isVeg: true,
        spice: 1,
        prep: 25,
        variants: [
          { en: "Regular", ne: "सामान्य", delta: 0, isDefault: true },
          { en: "Large", ne: "ठूलो", delta: 12000 },
        ],
        groups: ["addons"],
      },
      {
        slug: "chicken-thali",
        nameEn: "Chicken Thali",
        nameNe: "कुखुराको थाली",
        descEn:
          "Everything in the veg thali plus slow-cooked chicken curry on the bone.",
        descNe:
          "शाकाहारी थालीका सबै कुरा र बिस्तारै पकाएको हाडसहितको कुखुराको तरकारी।",
        price: 48000,
        isVeg: false,
        spice: 2,
        prep: 28,
        variants: [
          { en: "Regular", ne: "सामान्य", delta: 0, isDefault: true },
          { en: "Large", ne: "ठूलो", delta: 14000 },
        ],
        groups: ["spice", "addons"],
      },
      {
        slug: "mutton-thali",
        nameEn: "Mutton Thali",
        nameNe: "खसीको थाली",
        descEn:
          "Khasi curry cooked for four hours with mountain herbs, with the full thali spread.",
        descNe:
          "पहाडी जडीबुटीसहित चार घण्टा पकाएको खसीको तरकारी, पूरा थालीसँग।",
        price: 62000,
        isVeg: false,
        spice: 2,
        prep: 30,
        groups: ["spice", "addons"],
      },
      {
        slug: "dal-bhat-tarkari",
        nameEn: "Dal Bhat Tarkari",
        nameNe: "दाल भात तरकारी",
        descEn:
          "Just the essentials — steaming rice, tempered dal and one seasonal vegetable.",
        descNe:
          "आवश्यक कुरा मात्रै — तातो भात, झानेको दाल र एक मौसमी तरकारी।",
        price: 28000,
        isVeg: true,
        spice: 1,
        prep: 20,
        groups: ["addons"],
      },
    ],
  },
  {
    slug: "newari",
    nameEn: "Newari Specials",
    nameNe: "नेवारी परिकार",
    items: [
      {
        slug: "chatamari",
        nameEn: "Chatamari",
        nameNe: "चतामरी",
        descEn:
          "Rice-flour crepe topped with minced buff, egg and fresh coriander. Newari, not pizza.",
        descNe:
          "चामलको पिठोको रोटी, राँगाको किमा, अण्डा र ताजा धनियाँसहित। नेवारी हो, पिज्जा होइन।",
        price: 32000,
        isVeg: false,
        spice: 2,
        prep: 22,
        groups: ["spice"],
      },
      {
        slug: "buff-choila",
        nameEn: "Buff Choila",
        nameNe: "राँगाको छोइला",
        descEn:
          "Fire-charred buffalo tossed with mustard oil, timur and raw garlic. Smoky and sharp.",
        descNe:
          "आगोमा पोलेको राँगाको मासु, तोरीको तेल, टिमुर र काँचो लसुनसँग मिसाएको। धुवाँको बास्ना र तीखो।",
        price: 42000,
        isVeg: false,
        spice: 4,
        prep: 20,
        groups: ["spice"],
      },
      {
        slug: "bara",
        nameEn: "Bara",
        nameNe: "बरा",
        descEn:
          "Black lentil patty, crisp outside and soft within. Ask for it with egg.",
        descNe:
          "कालो दालको बरा, बाहिर कुरकुरे भित्र नरम। अण्डासहित पनि पाइन्छ।",
        price: 22000,
        isVeg: true,
        spice: 1,
        prep: 18,
        groups: ["addons"],
      },
      {
        slug: "samay-baji",
        nameEn: "Samay Baji",
        nameNe: "समयबजी",
        descEn:
          "The festival platter — beaten rice, choila, bara, black soybean, boiled egg and achar.",
        descNe:
          "चाडपर्वको थाली — चिउरा, छोइला, बरा, कालो भटमास, उसिनेको अण्डा र अचार।",
        price: 56000,
        isVeg: false,
        spice: 3,
        prep: 30,
        groups: ["spice"],
      },
    ],
  },
  {
    slug: "snacks",
    nameEn: "Snacks",
    nameNe: "खाजा",
    items: [
      {
        slug: "sel-roti",
        nameEn: "Sel Roti",
        nameNe: "सेलरोटी",
        descEn:
          "Sweet rice rings fried fresh each morning. Two per plate, with aloo achar.",
        descNe:
          "बिहानै ताजा तारेको गुलियो सेलरोटी। एक प्लेटमा दुईवटा, आलुको अचारसँग।",
        price: 16000,
        isVeg: true,
        spice: 0,
        prep: 12,
      },
      {
        slug: "wai-wai-sadeko",
        nameEn: "Wai Wai Sadeko",
        nameNe: "वाइ वाइ सँदेको",
        descEn:
          "Crushed noodles tossed raw with onion, chilli, coriander and lemon. Nostalgia food.",
        descNe:
          "मिचेको चाउचाउ, प्याज, खुर्सानी, धनियाँ र कागतीसँग सँदेको। सम्झनाको स्वाद।",
        price: 14000,
        isVeg: true,
        spice: 3,
        prep: 10,
        groups: ["spice"],
      },
      {
        slug: "aloo-chop",
        nameEn: "Aloo Chop",
        nameNe: "आलु चप",
        descEn:
          "Spiced potato cakes in a gram-flour crust, fried till they crackle.",
        descNe: "मसलादार आलुको चप, बेसनमा बेरेर कुरकुरे हुने गरी तारेको।",
        price: 15000,
        isVeg: true,
        spice: 2,
        prep: 15,
      },
    ],
  },
  {
    slug: "drinks-desserts",
    nameEn: "Drinks & Desserts",
    nameNe: "पेय र मिठाई",
    items: [
      {
        slug: "masala-chiya",
        nameEn: "Masala Chiya",
        nameNe: "मसला चिया",
        descEn:
          "Ilam leaves boiled with cardamom, clove and ginger. Milk, properly sweet.",
        descNe:
          "इलामको पत्ती, सुकुमेल, ल्वाङ र अदुवासँग उमालेको। दूधसहित, मिठो।",
        price: 8000,
        isVeg: true,
        spice: 0,
        prep: 8,
      },
      {
        slug: "juju-dhau",
        nameEn: "Juju Dhau",
        nameNe: "जुजु धौ",
        descEn:
          "Bhaktapur's king curd, set in a clay pot. Thick enough to stand a spoon in.",
        descNe:
          "भक्तपुरको राजा दही, माटोको भाँडोमा जमाएको। चम्चा उभिने गरी बाक्लो।",
        price: 18000,
        isVeg: true,
        spice: 0,
        prep: 5,
      },
      {
        slug: "sikarni",
        nameEn: "Sikarni",
        nameNe: "सिकर्णी",
        descEn:
          "Strained yoghurt whipped with cardamom, saffron and pistachio.",
        descNe: "छानेको दही, सुकुमेल, केशर र पेस्तासँग फिटेको।",
        price: 20000,
        isVeg: true,
        spice: 0,
        prep: 5,
      },
    ],
  },
];

const ZONES = [
  { en: "Baluwatar", ne: "बालुवाटार", fee: 8000 },
  { en: "Lazimpat", ne: "लाजिम्पाट", fee: 8000 },
  { en: "Thamel", ne: "ठमेल", fee: 10000 },
  { en: "Naxal", ne: "नक्साल", fee: 8000 },
  { en: "New Baneshwor", ne: "नयाँ बानेश्वर", fee: 12000 },
  { en: "Chabahil", ne: "चाबहिल", fee: 12000 },
  { en: "Boudha", ne: "बौद्ध", fee: 15000 },
  { en: "Patan / Jhamsikhel", ne: "पाटन / झम्सिखेल", fee: 15000 },
  { en: "Kalanki", ne: "कलंकी", fee: 18000, codAllowed: false },
];

async function seed() {
  console.log("Seeding…");

  // Idempotent: wipe in FK-safe order so the script can be re-run freely.
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

  const [spiceGroup] = await db
    .insert(s.modifierGroups)
    .values({
      nameEn: "Spice level",
      nameNe: "पिरोको मात्रा",
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
    })
    .returning();

  await db.insert(s.modifiers).values([
    { groupId: spiceGroup.id, nameEn: "Mild", nameNe: "कम पिरो", sortOrder: 0 },
    {
      groupId: spiceGroup.id,
      nameEn: "Medium",
      nameNe: "मध्यम",
      sortOrder: 1,
    },
    { groupId: spiceGroup.id, nameEn: "Hot", nameNe: "पिरो", sortOrder: 2 },
    {
      groupId: spiceGroup.id,
      nameEn: "Nepali hot",
      nameNe: "नेपाली पिरो",
      sortOrder: 3,
    },
  ]);

  const [addonGroup] = await db
    .insert(s.modifierGroups)
    .values({
      nameEn: "Add-ons",
      nameNe: "थप",
      minSelect: 0,
      maxSelect: 4,
      isRequired: false,
    })
    .returning();

  await db.insert(s.modifiers).values([
    {
      groupId: addonGroup.id,
      nameEn: "Extra achar",
      nameNe: "थप अचार",
      priceDelta: 3000,
      sortOrder: 0,
    },
    {
      groupId: addonGroup.id,
      nameEn: "Boiled egg",
      nameNe: "उसिनेको अण्डा",
      priceDelta: 4000,
      sortOrder: 1,
    },
    {
      groupId: addonGroup.id,
      nameEn: "Extra papad",
      nameNe: "थप पापड",
      priceDelta: 2500,
      sortOrder: 2,
    },
    {
      groupId: addonGroup.id,
      nameEn: "Ghee spoon",
      nameNe: "घिउ",
      priceDelta: 3500,
      sortOrder: 3,
    },
  ]);

  const groupIds = { spice: spiceGroup.id, addons: addonGroup.id };

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
          r2Key: photo(item.slug),
          mime: "image/jpeg",
          bytes: 0,
          width: 1200,
          height: 900,
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

      if (item.groups) {
        await db.insert(s.itemModifierGroups).values(
          item.groups.map((g, i) => ({
            itemId: row.id,
            groupId: groupIds[g],
            sortOrder: i,
          })),
        );
      }
    }
  }

  await db.insert(s.deliveryZones).values(
    ZONES.map((z, i) => ({
      nameEn: z.en,
      nameNe: z.ne,
      fee: z.fee,
      codAllowed: z.codAllowed ?? true,
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
    supportPhone: "+977-9800000000",
    bannerEn: "Free delivery on orders above Rs 1,500",
    bannerNe: "रु १,५०० माथिको अर्डरमा डेलिभरी नि:शुल्क",
  });

  console.log("Seeded. Admin login: owner@gharkoswad.com / changeme123");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
