import { faker } from "@faker-js/faker";
import {
  users,
  stores,
  orderItems,
  products,
  authLinks,
  categories,
  orders,
  productTags,
  productCategories,
  productImages,
  brands,
  tags,
} from "./schema";
import { db } from "./connection";
import chalk from "chalk";
import { createId } from "@paralleldrive/cuid2";

/**
 * Reset database
 */

await db.delete(authLinks);
await db.delete(orderItems);
await db.delete(orders);
await db.delete(productTags);
await db.delete(productCategories);
await db.delete(productImages);
await db.delete(products);
await db.delete(categories);
await db.delete(brands);
await db.delete(stores);
await db.delete(users);
await db.delete(tags);

console.log(chalk.yellow("✔ Databese reset!"));

/**
 * Create customers
 */

const [customer1, customer2] = await db
  .insert(users)
  .values([
    {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: "customer",
    },
    {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: "customer",
    },
  ])
  .returning();

console.log(chalk.yellow("✔ Created customers!"));

/**
 * Create manager
 */

const [manager] = await db
  .insert(users)
  .values([
    {
      name: faker.person.fullName(),
      email: "admin@admin.com",
      role: "manager",
    },
  ])
  .returning({
    id: users.id,
  });

if (!manager) {
  throw new Error("Manager user creation failed");
}

console.log(chalk.yellow("✔ Created manager!"));

/**
 * Create store
 */
const [store] = await db
  .insert(stores)
  .values([
    {
      name: faker.company.name(),
      description: faker.lorem.paragraph(),
      managerId: manager.id,
    },
  ])
  .returning();

if (!store) {
  throw new Error("Store creation failed.");
}

console.log(chalk.yellow("✔ Created store!"));

/**
 * Create categories
 */

const categoryNames = [
  "Industrial",
  "Games",
  "Electronics",
  "Fashion",
  "Home",
  "Sports",
  "Books",
  "Health",
];

const availableCategories = await db
  .insert(categories)
  .values(
    categoryNames.map((name) => ({
      name,
      storeId: store.id,
      createdAt: faker.date.past({ years: 1 }),
    }))
  )
  .returning();

console.log(chalk.yellow("✔ Created categories!"));

/**
 * Create brands
 */
const brandNames = [
  "TechMaster",
  "UrbanStyle",
  "NatureFresh",
  "HomeEssentials",
  "SportPro",
  "LuxuryLiving",
  "KidsWorld",
  "EcoFriendly",
];

const availableBrands = await db
  .insert(brands)
  .values(
    brandNames.map((name) => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      storeId: store.id,
      description: faker.lorem.sentence(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    }))
  )
  .returning();

console.log(chalk.yellow("✔ Created brands!"));

/**
 * Create products
 */
const availableProducts = await db
  .insert(products)
  .values(
    Array.from({ length: 10 }).map(() => ({
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      characteristics: faker.lorem.sentence(),
      priceInCents: faker.number.int({ min: 1990, max: 49990 }),
      sku: faker.string.alphanumeric(10).toUpperCase(),
      stock: faker.number.int({ min: 0, max: 100 }),
      isFeatured: faker.datatype.boolean(),
      isArchived: faker.datatype.boolean({ probability: 0.1 }),
      status: faker.helpers.arrayElement([
        "available",
        "unavailable",
        "archived",
      ]),
      categoryId: faker.helpers.arrayElement(availableCategories).id,
      brandId: faker.helpers.arrayElement(availableBrands).id,
      storeId: store.id,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    }))
  )
  .returning();

console.log(chalk.yellow("✔ Created products!"));

/**
 * Create tags
 */
const tagNames = ["promoção", "novo", "destaque", "desconto", "exclusivo"];
const availableTags = await db
  .insert(tags)
  .values(
    tagNames.map((name) => ({
      id: createId(), // Garante que as tags têm um ID válido
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      storeId: store.id,
      createdAt: new Date(),
    }))
  )
  .returning(); // Retorna os registros inseridos para reutilizá-los depois

console.log(chalk.yellow(`✔ Created ${availableTags.length} tags!`));
console.log("Available tags:", availableTags);

/**
 * Create product tags
 */
const productTagsToInsert: {
  id: string;
  productId: string;
  tagId: string;
  createdAt: Date;
}[] = [];

for (const product of availableProducts) {
  const numTags = faker.number.int({ min: 1, max: 3 });

  for (let i = 0; i < numTags; i++) {
    const randomTag = faker.helpers.arrayElement(availableTags); // Escolhe um ID de tag existente

    productTagsToInsert.push({
      id: createId(), // Se sua tabela exigir um ID
      productId: product.id,
      tagId: randomTag.id, // Usa um ID válido
      createdAt: new Date(),
    });
  }
}

await db.insert(productTags).values(productTagsToInsert);
console.log(
  chalk.yellow(`✔ Created ${productTagsToInsert.length} product tags!`)
);

/**
 * Create product categories (associação many-to-many)
 */
const productCategoriesToInsert = [];
for (const product of availableProducts) {
  const numAssociations = faker.number.int({ min: 1, max: 3 });
  for (let i = 0; i < numAssociations; i++) {
    const randomCategory = faker.helpers.arrayElement(availableCategories);
    productCategoriesToInsert.push({
      id: createId(), // Se necessário
      productId: product.id,
      categoryId: randomCategory.id,
      createdAt: new Date(),
    });
  }
}
await db.insert(productCategories).values(productCategoriesToInsert);
console.log(
  chalk.yellow(
    `✔ Created ${productCategoriesToInsert.length} product categories!`
  )
);

/**
 * Create product images
 */
const productImagesToInsert = [];
for (const product of availableProducts) {
  const numImages = faker.number.int({ min: 1, max: 3 });
  for (let i = 0; i < numImages; i++) {
    productImagesToInsert.push({
      id: createId(), // Se necessário
      productId: product.id,
      url: faker.image.urlLoremFlickr({
        category: "product",
        width: 640,
        height: 480,
      }),
      altText: faker.lorem.sentence(),
      createdAt: new Date(),
    });
  }
}
await db.insert(productImages).values(productImagesToInsert);
console.log(
  chalk.yellow(`✔ Created ${productImagesToInsert.length} product images!`)
);

/**
 * Create orders and order items
 */
type OrderItemInsert = typeof orderItems.$inferSelect;
type OrderInsert = typeof orders.$inferSelect;

const orderItemsToInsert: OrderItemInsert[] = [];
const ordersToInsert: OrderInsert[] = [];

for (let i = 0; i < 200; i++) {
  const orderId = createId();

  const orderProducts = faker.helpers.arrayElements(availableProducts, {
    min: 1,
    max: 3,
  });

  let totalInCents = 0;

  orderProducts.forEach((orderProduct) => {
    const quantity = faker.number.int({ min: 1, max: 3 });
    totalInCents += orderProduct.priceInCents * quantity;

    orderItemsToInsert.push({
      id: createId(),
      orderId,
      productId: orderProduct.id,
      priceInCents: orderProduct.priceInCents,
      quantity,
      productName: orderProduct.name,
      thumbnailUrl: faker.image.urlLoremFlickr({ category: "commerce" }), // Imagem fake
    });
  });

  ordersToInsert.push({
    id: orderId,
    customerId: faker.helpers.arrayElement([customer1.id, customer2.id]),
    storeId: store.id,
    totalInCents,
    status: faker.helpers.arrayElement([
      "pending",
      "payment_approved",
      "processing",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "completed",
    ]),
    createdAt: faker.date.recent({ days: 40 }),
  });
}

// Inserir primeiro os pedidos
await db.insert(orders).values(ordersToInsert);
// Depois os itens
await db.insert(orderItems).values(orderItemsToInsert);

console.log(chalk.yellow(`✔ Created ${ordersToInsert.length} orders!`));
console.log(
  chalk.yellow(`✔ Created ${orderItemsToInsert.length} order items!`)
);

console.log(chalk.greenBright("Database seeded successfully!"));

process.exit(0);
