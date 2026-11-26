// Seed the database.
//   bun scripts/seed.ts          → core only: settings, legal pages, categories, admin account
//   bun scripts/seed.ts --demo   → core + demo publishers, magazines, editions, covers
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

const db = new PrismaClient();
const DEMO = process.argv.includes("--demo");
const COVERS = join(process.cwd(), "prisma", "demo-covers");

async function imageFrom(path: string, kind: string) {
  const buf = readFileSync(path);
  const meta = await db.image.create({
    data: { kind, mime: "image/png", size: buf.length, width: 620, height: 876, data: buf },
  });
  return meta.id;
}

async function main() {
  // ---- settings defaults ----
  const settings: Record<string, string> = {
    app_name: "Pigeon Press",
    primary_color: "#274540",
    font_family: "inter",
    splash_bg_color: "#274540",
    splash_logo_id: "",
    splash_logo_size: "medium",
    splash_logo_position: "center",
    header_logo_id: "",
    header_logo_size: "medium",
    header_logo_position: "left",
    background_image_id: "",
    background_position: "center",
    background_size: "cover",
    background_parallax: "off",
    background_opacity: "0.10",
    app_icon_id: "",
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // ---- legal pages ----
  await db.page.upsert({
    where: { slug: "terms" },
    update: {},
    create: {
      slug: "terms",
      title: "Terms and Conditions",
      content: [
        "TERMS AND CONDITIONS",
        "",
        "1. Acceptance of terms",
        "By accessing or using Pigeon Press (\"the Platform\"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Platform.",
        "",
        "2. The service",
        "Pigeon Press is a digital newsstand. Publishers submit magazines and editions for review; readers browse, favourite and read approved publications in the built-in reader.",
        "",
        "3. Publisher obligations",
        "Publishers must own or hold the rights to every magazine and edition they submit, including covers and flipbook content. Submitting content you do not have the right to publish is grounds for removal of the publication and the publisher account.",
        "",
        "4. Approval and moderation",
        "All publishers, magazines and editions pass through an approval queue before appearing publicly. The Platform may reject or remove any content at its discretion and may feature selected publications on the home page.",
        "",
        "5. Reader conduct",
        "Readers may browse without an account. Creating an account requires a valid email address. Abuse of the Platform (including attempts to disrupt service or scrape content) may result in suspension.",
        "",
        "6. Intellectual property",
        "All magazines remain the property of their publishers. Nothing in these Terms transfers ownership of any publication to the Platform or to other readers.",
        "",
        "7. Limitation of liability",
        "The Platform is provided \"as is\" without warranties of any kind. To the maximum extent permitted by law, the Platform is not liable for any indirect or consequential loss arising from use of the service.",
        "",
        "8. Changes",
        "These Terms may be updated from time to time. Continued use of the Platform after changes are published constitutes acceptance of the updated Terms.",
        "",
        "9. Contact",
        "Questions about these Terms can be sent through the contact details published on this Platform.",
      ].join("\n"),
    },
  });

  await db.page.upsert({
    where: { slug: "privacy" },
    update: {},
    create: {
      slug: "privacy",
      title: "Privacy Policy",
      content: [
        "PRIVACY POLICY",
        "",
        "1. What we collect",
        "We collect the minimum information needed to run the Platform: your email address and display name when you register; publisher company details when you register a publication; images you upload (covers, logos, backgrounds); and app usage needed to keep the service working (favourites, notifications, session data).",
        "",
        "2. Passwords",
        "Passwords are stored only as salted hashes and can never be read by anyone, including administrators.",
        "",
        "3. Images",
        "Uploaded images are stored in the Platform database and served only through the Platform. Cover images and logos are visible publicly once a magazine is approved; unpublished drafts remain private.",
        "",
        "4. Notifications",
        "If you favourite a magazine with notifications enabled, we store and send you an in-app notification when a new edition of that magazine is approved. You can disable this per magazine or clear notifications at any time.",
        "",
        "5. Cookies",
        "We use a single session cookie to keep you signed in. No advertising or tracking cookies are used.",
        "",
        "6. Data sharing",
        "We do not sell or share personal information with third parties. No subscription or payment data exists on the Platform because the service is free.",
        "",
        "7. Your rights",
        "You may request correction or deletion of your account and personal data at any time. Publisher content already approved may be unpublished on request.",
        "",
        "8. Changes",
        "This policy may be updated from time to time; the latest version is always available on this page.",
      ].join("\n"),
    },
  });

  // ---- categories ----
  const catData = [
    ["Business", "business"], ["Technology", "technology"], ["Lifestyle", "lifestyle"],
    ["Health", "health"], ["Travel", "travel"], ["Fashion", "fashion"],
    ["Sports", "sports"], ["Education", "education"], ["Entertainment", "entertainment"],
    ["News", "news"],
  ];
  const cats: Record<string, string> = {};
  for (let i = 0; i < catData.length; i++) {
    const [name, slug] = catData[i];
    const c = await db.category.upsert({
      where: { slug }, update: { sortOrder: i },
      create: { name, slug, sortOrder: i },
    });
    cats[name] = c.id;
  }

  // ---- users ----
  const pw = (p: string) => hashSync(p, 10);
  await db.user.upsert({
    where: { email: "admin@pigeoncomms.co.za" },
    update: { passwordHash: pw("Admin@12345") },
    create: { email: "admin@pigeoncomms.co.za", name: "Platform Admin", role: "ADMIN", passwordHash: pw("Admin@12345") },
  });

  if (!DEMO) {
    console.log("Core seed complete (settings, pages, categories, admin account).");
    console.log("  admin@pigeoncomms.co.za / Admin@12345  (ADMIN)");
    return;
  }

  const pubUser = await db.user.upsert({
    where: { email: "publisher@pigeoncomms.co.za" },
    update: { passwordHash: pw("Publisher@12345") },
    create: { email: "publisher@pigeoncomms.co.za", name: "Coast Media", role: "PUBLISHER", passwordHash: pw("Publisher@12345") },
  });
  const pendUser = await db.user.upsert({
    where: { email: "karoo@pigeoncomms.co.za" },
    update: { passwordHash: pw("Publisher@12345") },
    create: { email: "karoo@pigeoncomms.co.za", name: "Karoo Press", role: "PUBLISHER", passwordHash: pw("Publisher@12345") },
  });
  const reader = await db.user.upsert({
    where: { email: "reader@pigeoncomms.co.za" },
    update: { passwordHash: pw("Reader@12345") },
    create: { email: "reader@pigeoncomms.co.za", name: "Demo Reader", role: "READER", passwordHash: pw("Reader@12345") },
  });

  // ---- publishers ----
  const coast = await db.publisher.upsert({
    where: { userId: pubUser.id },
    update: { status: "APPROVED" },
    create: {
      userId: pubUser.id, companyName: "Coast Media (Pty) Ltd",
      contactEmail: "publisher@pigeoncomms.co.za",
      about: "Independent publisher of business, technology and lifestyle titles based in Cape Town.",
      status: "APPROVED",
    },
  });
  const karoo = await db.publisher.upsert({
    where: { userId: pendUser.id },
    update: {},
    create: {
      userId: pendUser.id, companyName: "Karoo Press CC",
      contactEmail: "karoo@pigeoncomms.co.za",
      about: "Small-town stories from the Great Karoo.",
      status: "PENDING",
    },
  });

  // ---- magazines + editions ----
  async function addMagazine(o: {
    title: string; desc: string; cat: string; cover: string; featured: boolean;
    publisherId: string; status: string; freq: string;
  }) {
    const coverId = await imageFrom(`${COVERS}/${o.cover}.png`, "cover");
    return db.magazine.upsert({
      where: { id: `seed-${o.cover}` }, update: { featured: o.featured },
      create: {
        id: `seed-${o.cover}`, publisherId: o.publisherId, title: o.title,
        description: o.desc, categoryId: cats[o.cat], coverImageId: coverId,
        flipbookUrl: "https://example.com/flipbook/demo", frequency: o.freq,
        status: o.status, featured: o.featured, website: "https://pigeoncomms.co.za",
      },
    });
  }

  const m1 = await addMagazine({
    title: "African Business Review", cat: "Business", cover: "african-business-review",
    desc: "Boardroom insight, market data and founder stories from across the continent. Published monthly for decision-makers.",
    featured: true, publisherId: coast.id, status: "APPROVED", freq: "Monthly",
  });
  const m2 = await addMagazine({
    title: "Tech Frontier Africa", cat: "Technology", cover: "tech-frontier",
    desc: "The developers, startups and infrastructure shaping African technology. Deep features, no hype.",
    featured: true, publisherId: coast.id, status: "APPROVED", freq: "Monthly",
  });
  const m3 = await addMagazine({
    title: "Cape Lifestyle", cat: "Lifestyle", cover: "cape-lifestyle",
    desc: "Food, design, wine and weekend escapes in and around the Cape.",
    featured: false, publisherId: coast.id, status: "APPROVED", freq: "Quarterly",
  });
  const m4 = await addMagazine({
    title: "Health & Wellness Journal", cat: "Health", cover: "health-wellness",
    desc: "Evidence-based fitness, nutrition and mental wellbeing for South African families.",
    featured: false, publisherId: coast.id, status: "APPROVED", freq: "Bi-Monthly",
  });
  const m5 = await addMagazine({
    title: "Wander Travel South Africa", cat: "Travel", cover: "wander-travel",
    desc: "Routes, hideaways and road trips — explore the country one issue at a time.",
    featured: true, publisherId: coast.id, status: "APPROVED", freq: "Monthly",
  });
  const m6 = await addMagazine({
    title: "Design & Build Quarterly", cat: "Education", cover: "design-build",
    desc: "Architecture, engineering and sustainable construction projects, explained.",
    featured: false, publisherId: coast.id, status: "APPROVED", freq: "Quarterly",
  });
  const m7 = await addMagazine({
    title: "Karoo Stories", cat: "Lifestyle", cover: "karoo-stories",
    desc: "People, places and quiet roads of the Great Karoo. First issue awaiting approval.",
    featured: false, publisherId: karoo.id, status: "PENDING", freq: "Quarterly",
  });

  // editions for a few approved magazines (demo reader experience)
  async function addEdition(magId: string, title: string, issue: string, daysAgo: number) {
    const publishedAt = new Date(Date.now() - daysAgo * 86400000);
    return db.edition.upsert({
      where: { id: `seed-ed-${magId}-${issue}` }, update: {},
      create: {
        id: `seed-ed-${magId}-${issue}`, magazineId: magId, title, issueNumber: issue,
        description: `${title} — the full flipbook edition.`,
        flipbookUrl: "https://example.com/flipbook/demo",
        status: "APPROVED", publishedAt,
      },
    });
  }
  await addEdition(m1.id, "November Edition", "2026-11", 6);
  await addEdition(m1.id, "October Edition", "2026-10", 36);
  await addEdition(m2.id, "Launch Issue", "2026-01", 10);
  await addEdition(m5.id, "West Coast Special", "2026-11", 3);
  await addEdition(m3.id, "Summer Issue", "2026-04", 20);
  // pending edition for admin demo
  await db.edition.upsert({
    where: { id: "seed-ed-pending-1" }, update: {},
    create: {
      id: "seed-ed-pending-1", magazineId: m4.id, title: "December Edition", issueNumber: "2026-12",
      flipbookUrl: "https://example.com/flipbook/demo", status: "PENDING",
    },
  });

  // ---- reader demo: favourites + notifications ----
  for (const m of [m1, m2, m5]) {
    await db.favourite.upsert({
      where: { userId_magazineId: { userId: reader.id, magazineId: m.id } },
      update: {}, create: { userId: reader.id, magazineId: m.id, notify: true },
    });
  }
  await db.notification.createMany({
    data: [
      { userId: reader.id, title: "Welcome to Pigeon Press", body: "Browse magazines, tap the bookmark to save favourites and get notified about new editions." },
      { userId: reader.id, title: "New edition: Wander Travel South Africa", body: "West Coast Special (2026-11) is ready to read." },
    ],
  });
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@pigeoncomms.co.za" } });
  await db.notification.createMany({
    data: [
      { userId: admin.id, title: "Publisher pending approval", body: "Karoo Press CC submitted a publisher registration." },
      { userId: admin.id, title: "Magazine pending approval", body: "\"Karoo Stories\" by Karoo Press CC is waiting for review." },
    ],
  });

  console.log("Seed complete:");
  console.log("  admin@pigeoncomms.co.za / Admin@12345  (ADMIN)");
  console.log("  publisher@pigeoncomms.co.za / Publisher@12345  (PUBLISHER, approved)");
  console.log("  karoo@pigeoncomms.co.za / Publisher@12345  (PUBLISHER, pending)");
  console.log("  reader@pigeoncomms.co.za / Reader@12345  (READER)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
