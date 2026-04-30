import {
  PrismaClient,
  ProductSource,
  ProductGender,
  ProductSeason,
  CapsuleCategory,
  ProductStatus,
  ProductCondition,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

interface ProductSeed {
  sku: string;
  categorySlug: string;
  nameEn: string;
  nameFr: string;
  nameEs: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionEs: string;
  brand: string;
  sizeEu: string;
  sizeUk?: string;
  sizeUs?: string;
  color: string;
  material?: string;
  weightGrams: number;
  gender: ProductGender;
  season: ProductSeason;
  maxCycles: number;
  purchasePrice: number;
  rentalPricePerDay: number;
  source: ProductSource;
  /** Stock distribution: cityCode → number of units */
  stock: Record<string, number>;
}

const PRODUCT_SEEDS: ProductSeed[] = [
  // Tops
  {
    sku: 'TOP-ZARA-WH-M-001',
    categorySlug: 'tops',
    nameEn: 'White Linen Shirt',
    nameFr: 'Chemise en lin blanc',
    nameEs: 'Camisa de lino blanca',
    descriptionEn: 'Light white linen shirt, perfect for warm days.',
    descriptionFr: 'Chemise légère en lin blanc.',
    descriptionEs: 'Camisa ligera de lino blanco.',
    brand: 'Zara',
    sizeEu: 'M',
    color: 'white',
    material: 'linen 100%',
    weightGrams: 180,
    gender: ProductGender.men,
    season: ProductSeason.spring_summer,
    maxCycles: 15,
    purchasePrice: 12,
    rentalPricePerDay: 2.5,
    source: ProductSource.vinted,
    stock: { paris: 3, nice: 2, lyon: 1 },
  },
  {
    sku: 'TOP-COS-BLK-S-001',
    categorySlug: 'tops',
    nameEn: 'Silk Blouse',
    nameFr: 'Chemisier en soie',
    nameEs: 'Blusa de seda',
    descriptionEn: 'Elegant black silk blouse for dinners or workdays.',
    descriptionFr: 'Blouse en soie noire élégante.',
    descriptionEs: 'Blusa elegante de seda negra.',
    brand: 'COS',
    sizeEu: 'S',
    color: 'black',
    material: 'silk 100%',
    weightGrams: 160,
    gender: ProductGender.women,
    season: ProductSeason.all_season,
    maxCycles: 12,
    purchasePrice: 35,
    rentalPricePerDay: 4,
    source: ProductSource.wholesale,
    stock: { paris: 2, nice: 1 },
  },
  {
    sku: 'TOP-UNI-BEIGE-M-001',
    categorySlug: 'tops',
    nameEn: 'Cotton Poplin Shirt',
    nameFr: 'Chemise en popeline de coton',
    nameEs: 'Camisa de popelín',
    descriptionEn: 'Classic cotton poplin shirt, versatile for any occasion.',
    descriptionFr: 'Chemise en popeline de coton classique.',
    descriptionEs: 'Camisa clásica de popelín de algodón.',
    brand: 'Uniqlo',
    sizeEu: 'M',
    color: 'beige',
    material: 'cotton 100%',
    weightGrams: 200,
    gender: ProductGender.unisex,
    season: ProductSeason.all_season,
    maxCycles: 20,
    purchasePrice: 18,
    rentalPricePerDay: 2.5,
    source: ProductSource.wholesale,
    stock: { paris: 4, nice: 2, lyon: 2 },
  },

  // Bottoms
  {
    sku: 'BTM-HM-BLK-32-001',
    categorySlug: 'bottoms',
    nameEn: 'Black Slim Jeans',
    nameFr: 'Jean slim noir',
    nameEs: 'Jeans slim negro',
    descriptionEn: 'Classic black slim-fit jeans.',
    descriptionFr: 'Jean slim classique noir.',
    descriptionEs: 'Jeans negros clásicos de corte slim.',
    brand: 'H&M',
    sizeEu: '32',
    color: 'black',
    material: 'cotton 98%, elastane 2%',
    weightGrams: 450,
    gender: ProductGender.men,
    season: ProductSeason.all_season,
    maxCycles: 18,
    purchasePrice: 8,
    rentalPricePerDay: 2,
    source: ProductSource.vinted,
    stock: { paris: 3, nice: 1 },
  },
  {
    sku: 'BTM-COS-BEI-38-001',
    categorySlug: 'bottoms',
    nameEn: 'Tailored Trousers',
    nameFr: 'Pantalon tailleur',
    nameEs: 'Pantalón sastre',
    descriptionEn: 'Structured beige tailored trousers.',
    descriptionFr: 'Pantalon tailleur beige structuré.',
    descriptionEs: 'Pantalón sastre beige estructurado.',
    brand: 'COS',
    sizeEu: '38',
    color: 'beige',
    material: 'wool blend',
    weightGrams: 380,
    gender: ProductGender.women,
    season: ProductSeason.all_season,
    maxCycles: 15,
    purchasePrice: 40,
    rentalPricePerDay: 4,
    source: ProductSource.wholesale,
    stock: { paris: 2, nice: 1, lyon: 1 },
  },

  // Dresses
  {
    sku: 'DRS-ZARA-BLU-S-001',
    categorySlug: 'dresses',
    nameEn: 'Blue Floral Midi Dress',
    nameFr: 'Robe midi fleurie bleue',
    nameEs: 'Vestido midi floral azul',
    descriptionEn: 'Elegant blue floral midi dress.',
    descriptionFr: 'Robe midi fleurie bleue élégante.',
    descriptionEs: 'Vestido midi floral azul elegante.',
    brand: 'Zara',
    sizeEu: 'S',
    sizeUk: '8',
    sizeUs: '4',
    color: 'blue',
    material: 'viscose 100%',
    weightGrams: 280,
    gender: ProductGender.women,
    season: ProductSeason.spring_summer,
    maxCycles: 12,
    purchasePrice: 15,
    rentalPricePerDay: 3.5,
    source: ProductSource.vinted,
    stock: { paris: 3, nice: 2 },
  },
  {
    sku: 'DRS-REF-BLK-M-001',
    categorySlug: 'dresses',
    nameEn: 'Little Black Dress',
    nameFr: 'Petite robe noire',
    nameEs: 'Vestido negro',
    descriptionEn: 'Timeless LBD for evenings out.',
    descriptionFr: 'Petite robe noire intemporelle.',
    descriptionEs: 'Vestido negro atemporal.',
    brand: 'Reformation',
    sizeEu: 'M',
    color: 'black',
    material: 'viscose 95%, elastane 5%',
    weightGrams: 260,
    gender: ProductGender.women,
    season: ProductSeason.all_season,
    maxCycles: 14,
    purchasePrice: 60,
    rentalPricePerDay: 5,
    source: ProductSource.wholesale,
    stock: { paris: 2, lyon: 1 },
  },

  // Outerwear
  {
    sku: 'OUT-UNI-NVY-L-001',
    categorySlug: 'outerwear',
    nameEn: 'Navy Lightweight Jacket',
    nameFr: 'Veste légère marine',
    nameEs: 'Chaqueta ligera azul marino',
    descriptionEn: 'Versatile navy lightweight jacket.',
    descriptionFr: 'Veste légère marine polyvalente.',
    descriptionEs: 'Chaqueta ligera azul marino versátil.',
    brand: 'Uniqlo',
    sizeEu: 'L',
    color: 'navy',
    material: 'polyester 100%',
    weightGrams: 350,
    gender: ProductGender.unisex,
    season: ProductSeason.all_season,
    maxCycles: 20,
    purchasePrice: 25,
    rentalPricePerDay: 3,
    source: ProductSource.vinted,
    stock: { paris: 2, nice: 2, lyon: 1 },
  },
  {
    sku: 'OUT-SAN-CAM-M-001',
    categorySlug: 'outerwear',
    nameEn: 'Camel Wool Coat',
    nameFr: 'Manteau en laine camel',
    nameEs: 'Abrigo de lana camel',
    descriptionEn: 'Classic camel wool coat for winter travel.',
    descriptionFr: "Manteau en laine camel classique pour l'hiver.",
    descriptionEs: 'Abrigo de lana camel clásico para invierno.',
    brand: 'Sandro',
    sizeEu: 'M',
    color: 'camel',
    material: 'wool 80%, cashmere 20%',
    weightGrams: 1200,
    gender: ProductGender.women,
    season: ProductSeason.fall_winter,
    maxCycles: 10,
    purchasePrice: 180,
    rentalPricePerDay: 8,
    source: ProductSource.wholesale,
    stock: { paris: 2, lyon: 1 },
  },

  // Shoes
  {
    sku: 'SHO-ADI-WHT-42-001',
    categorySlug: 'shoes',
    nameEn: 'White Sneakers',
    nameFr: 'Baskets blanches',
    nameEs: 'Zapatillas blancas',
    descriptionEn: 'Clean white Adidas sneakers.',
    descriptionFr: 'Baskets Adidas blanches.',
    descriptionEs: 'Zapatillas Adidas blancas.',
    brand: 'Adidas',
    sizeEu: '42',
    sizeUk: '8',
    sizeUs: '9',
    color: 'white',
    weightGrams: 600,
    gender: ProductGender.unisex,
    season: ProductSeason.all_season,
    maxCycles: 12,
    purchasePrice: 20,
    rentalPricePerDay: 2.5,
    source: ProductSource.vinted,
    stock: { paris: 2, nice: 1, lyon: 1 },
  },

  // Accessories — the missing category!
  {
    sku: 'ACC-LON-BRN-OS-001',
    categorySlug: 'accessories',
    nameEn: 'Leather Travel Belt',
    nameFr: 'Ceinture de voyage en cuir',
    nameEs: 'Cinturón de viaje de cuero',
    descriptionEn: 'Premium brown leather belt.',
    descriptionFr: 'Ceinture en cuir marron.',
    descriptionEs: 'Cinturón de cuero marrón.',
    brand: 'Longchamp',
    sizeEu: 'OS',
    color: 'brown',
    material: 'leather',
    weightGrams: 250,
    gender: ProductGender.unisex,
    season: ProductSeason.all_season,
    maxCycles: 30,
    purchasePrice: 45,
    rentalPricePerDay: 1.5,
    source: ProductSource.wholesale,
    stock: { paris: 2, nice: 1 },
  },
  {
    sku: 'ACC-HER-MUL-OS-001',
    categorySlug: 'accessories',
    nameEn: 'Silk Scarf',
    nameFr: 'Foulard en soie',
    nameEs: 'Pañuelo de seda',
    descriptionEn: 'Versatile printed silk scarf.',
    descriptionFr: 'Foulard en soie imprimé.',
    descriptionEs: 'Pañuelo de seda estampado.',
    brand: 'Hermès-style',
    sizeEu: 'OS',
    color: 'multicolor',
    material: 'silk 100%',
    weightGrams: 60,
    gender: ProductGender.women,
    season: ProductSeason.all_season,
    maxCycles: 20,
    purchasePrice: 30,
    rentalPricePerDay: 2,
    source: ProductSource.vinted,
    stock: { paris: 3, lyon: 2 },
  },
  {
    sku: 'ACC-RAY-BLK-OS-001',
    categorySlug: 'accessories',
    nameEn: 'Aviator Sunglasses',
    nameFr: 'Lunettes aviateur',
    nameEs: 'Gafas aviador',
    descriptionEn: 'Classic aviator sunglasses.',
    descriptionFr: 'Lunettes de soleil aviateur.',
    descriptionEs: 'Gafas de sol aviador clásicas.',
    brand: 'Ray-Ban',
    sizeEu: 'OS',
    color: 'black',
    material: 'metal + glass',
    weightGrams: 50,
    gender: ProductGender.unisex,
    season: ProductSeason.spring_summer,
    maxCycles: 25,
    purchasePrice: 80,
    rentalPricePerDay: 3,
    source: ProductSource.wholesale,
    stock: { paris: 2, nice: 2 },
  },

  // Swimwear
  {
    sku: 'SWM-REF-NAV-S-001',
    categorySlug: 'swimwear',
    nameEn: 'One-piece Swimsuit',
    nameFr: 'Maillot une pièce',
    nameEs: 'Bañador de una pieza',
    descriptionEn: 'Sustainable navy one-piece.',
    descriptionFr: 'Maillot une pièce marine durable.',
    descriptionEs: 'Bañador de una pieza azul marino sostenible.',
    brand: 'Reformation',
    sizeEu: 'S',
    color: 'navy',
    material: 'recycled nylon',
    weightGrams: 120,
    gender: ProductGender.women,
    season: ProductSeason.spring_summer,
    maxCycles: 15,
    purchasePrice: 50,
    rentalPricePerDay: 3,
    source: ProductSource.wholesale,
    stock: { nice: 2, paris: 1 },
  },

  // Suits
  {
    sku: 'SUI-SAN-NAV-48-001',
    categorySlug: 'suits',
    nameEn: 'Navy Two-piece Suit',
    nameFr: 'Costume deux pièces marine',
    nameEs: 'Traje azul marino dos piezas',
    descriptionEn: 'Tailored navy suit, jacket + trousers.',
    descriptionFr: 'Costume marine ajusté, veste + pantalon.',
    descriptionEs: 'Traje marino entallado.',
    brand: 'Sandro',
    sizeEu: '48',
    color: 'navy',
    material: 'wool 100%',
    weightGrams: 1400,
    gender: ProductGender.men,
    season: ProductSeason.all_season,
    maxCycles: 12,
    purchasePrice: 200,
    rentalPricePerDay: 10,
    source: ProductSource.wholesale,
    stock: { paris: 2 },
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin + customer ───────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rental.local' },
    update: {},
    create: {
      email: 'admin@rental.local',
      passwordHash: adminPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      locale: 'fr',
    },
  });
  console.log(`✓ Admin: ${admin.email}`);

  const customerPassword = await bcrypt.hash('customer123!', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@rental.local' },
    update: {},
    create: {
      email: 'customer@rental.local',
      passwordHash: customerPassword,
      role: 'customer',
      firstName: 'Test',
      lastName: 'Customer',
      locale: 'en',
    },
  });
  console.log(`✓ Customer: ${customer.email}`);

  // System user for background operations (order confirmations, etc.)
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@maisonvoyageur.internal' },
    update: {},
    create: {
      email: 'system@maisonvoyageur.internal',
      passwordHash: await bcrypt.hash(randomBytes(40).toString('hex'), 12),
      role: 'admin',
      firstName: 'System',
      lastName: 'Bot',
      locale: 'fr',
    },
  });
  console.log(`✓ System user: ${systemUser.id}`);

  // ─── Categories ─────────────────────────────────────────────
  const categoryDefs = [
    {
      slug: 'tops',
      nameEn: 'Tops & T-Shirts',
      nameFr: 'Hauts & T-Shirts',
      nameEs: 'Tops y Camisetas',
      sortOrder: 1,
    },
    { slug: 'bottoms', nameEn: 'Bottoms', nameFr: 'Bas', nameEs: 'Pantalones', sortOrder: 2 },
    { slug: 'dresses', nameEn: 'Dresses', nameFr: 'Robes', nameEs: 'Vestidos', sortOrder: 3 },
    {
      slug: 'outerwear',
      nameEn: 'Outerwear & Jackets',
      nameFr: 'Manteaux & Vestes',
      nameEs: 'Abrigos y Chaquetas',
      sortOrder: 4,
    },
    { slug: 'shoes', nameEn: 'Shoes', nameFr: 'Chaussures', nameEs: 'Zapatos', sortOrder: 5 },
    {
      slug: 'accessories',
      nameEn: 'Accessories',
      nameFr: 'Accessoires',
      nameEs: 'Accesorios',
      sortOrder: 6,
    },
    {
      slug: 'suits',
      nameEn: 'Suits & Formal',
      nameFr: 'Costumes & Formel',
      nameEs: 'Trajes y Formal',
      sortOrder: 7,
    },
    {
      slug: 'swimwear',
      nameEn: 'Swimwear',
      nameFr: 'Maillots de bain',
      nameEs: 'Ropa de baño',
      sortOrder: 8,
    },
  ];
  const categories = await Promise.all(
    categoryDefs.map((c) =>
      prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c }),
    ),
  );
  const categoryMap = Object.fromEntries(categories.map((c) => [c.slug, c]));
  console.log(`✓ ${categories.length} categories`);

  // ─── Products + Inventory Units ─────────────────────────────
  let totalUnits = 0;
  for (const seed of PRODUCT_SEEDS) {
    const product = await prisma.product.upsert({
      where: { sku: seed.sku },
      update: {},
      create: {
        categoryId: categoryMap[seed.categorySlug]!.id,
        sku: seed.sku,
        nameEn: seed.nameEn,
        nameFr: seed.nameFr,
        nameEs: seed.nameEs,
        descriptionEn: seed.descriptionEn,
        descriptionFr: seed.descriptionFr,
        descriptionEs: seed.descriptionEs,
        brand: seed.brand,
        sizeEu: seed.sizeEu,
        sizeUk: seed.sizeUk,
        sizeUs: seed.sizeUs,
        color: seed.color,
        material: seed.material,
        weightGrams: seed.weightGrams,
        gender: seed.gender,
        season: seed.season,
        condition: ProductCondition.new,
        cycleCount: 0,
        maxCycles: seed.maxCycles,
        purchasePrice: seed.purchasePrice,
        rentalPricePerDay: seed.rentalPricePerDay,
        source: seed.source,
        status: ProductStatus.available,
        city: 'paris',
      },
    });

    // Only create units if none exist yet
    const existingCount = await prisma.inventoryUnit.count({ where: { productId: product.id } });
    if (existingCount === 0) {
      for (const [city, count] of Object.entries(seed.stock)) {
        for (let i = 0; i < count; i++) {
          await prisma.inventoryUnit.create({
            data: {
              productId: product.id,
              city,
              status: ProductStatus.available,
              condition: ProductCondition.new,
              cycleCount: 0,
            },
          });
          totalUnits += 1;
        }
      }
    }
  }
  console.log(
    `✓ ${PRODUCT_SEEDS.length} products with ${totalUnits} inventory units (paris/nice/lyon)`,
  );

  // ─── Capsule wardrobes ──────────────────────────────────────
  const capsuleSeeds = [
    {
      slug: 'paris-city-break-5d',
      nameEn: 'Paris City Break — 5 Days',
      nameFr: 'Escapade Parisienne — 5 Jours',
      nameEs: 'Escapada París — 5 Días',
      descriptionEn: 'Everything you need for 5 days exploring Paris.',
      descriptionFr: 'Tout pour 5 jours à Paris.',
      descriptionEs: 'Todo para 5 días en París.',
      categoryType: CapsuleCategory.city,
      season: ProductSeason.spring_summer,
      gender: ProductGender.unisex,
      basePrice: 30,
      items: [
        { slug: 'tops', quantity: 3, isRequired: true },
        { slug: 'bottoms', quantity: 2, isRequired: true },
        { slug: 'shoes', quantity: 1, isRequired: true },
        { slug: 'outerwear', quantity: 1, isRequired: false },
        { slug: 'accessories', quantity: 1, isRequired: false },
      ],
    },
    {
      slug: 'cote-dazur-weekend',
      nameEn: "Côte d'Azur Weekend",
      nameFr: "Week-end Côte d'Azur",
      nameEs: 'Fin de semana Costa Azul',
      descriptionEn: 'Light, breezy pieces for a Mediterranean escape.',
      descriptionFr: 'Pièces légères pour une escapade méditerranéenne.',
      descriptionEs: 'Piezas ligeras para una escapada mediterránea.',
      categoryType: CapsuleCategory.beach,
      season: ProductSeason.spring_summer,
      gender: ProductGender.women,
      basePrice: 35,
      items: [
        { slug: 'dresses', quantity: 2, isRequired: true },
        { slug: 'swimwear', quantity: 1, isRequired: true },
        { slug: 'shoes', quantity: 1, isRequired: true },
        { slug: 'accessories', quantity: 2, isRequired: false },
      ],
    },
    {
      slug: 'business-trip-paris',
      nameEn: 'Business Trip — Paris',
      nameFr: "Voyage d'affaires — Paris",
      nameEs: 'Viaje de negocios — París',
      descriptionEn: 'Sharp, professional pieces for meetings in Paris.',
      descriptionFr: 'Tenues professionnelles impeccables pour Paris.',
      descriptionEs: 'Piezas profesionales para reuniones en París.',
      categoryType: CapsuleCategory.business,
      season: ProductSeason.all_season,
      gender: ProductGender.men,
      basePrice: 45,
      items: [
        { slug: 'suits', quantity: 1, isRequired: true },
        { slug: 'tops', quantity: 2, isRequired: true },
        { slug: 'shoes', quantity: 1, isRequired: true },
      ],
    },
  ];

  for (const c of capsuleSeeds) {
    const capsule = await prisma.capsuleWardrobe.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        slug: c.slug,
        nameEn: c.nameEn,
        nameFr: c.nameFr,
        nameEs: c.nameEs,
        descriptionEn: c.descriptionEn,
        descriptionFr: c.descriptionFr,
        descriptionEs: c.descriptionEs,
        categoryType: c.categoryType,
        season: c.season,
        gender: c.gender,
        basePrice: c.basePrice,
        isActive: true,
      },
    });
    // wipe existing items to avoid duplicates
    await prisma.capsuleWardrobeItem.deleteMany({ where: { capsuleId: capsule.id } });
    for (const item of c.items) {
      await prisma.capsuleWardrobeItem.create({
        data: {
          capsuleId: capsule.id,
          categoryId: categoryMap[item.slug]!.id,
          quantity: item.quantity,
          isRequired: item.isRequired,
        },
      });
    }
  }
  console.log(`✓ ${capsuleSeeds.length} capsule wardrobes`);

  console.log('\n✅ Seed complete');
  console.log('\nTest credentials:');
  console.log('  Admin:    admin@rental.local / admin123!');
  console.log('  Customer: customer@rental.local / customer123!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
