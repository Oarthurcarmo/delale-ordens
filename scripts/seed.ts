import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { users, stores, products } from "../src/server/schema";

const db = drizzle(process.env.DATABASE_URL!);
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // Create stores
  const store1 = await db
    .insert(stores)
    .values({ name: "Filial 1 - Centro" })
    .returning();
  const store2 = await db
    .insert(stores)
    .values({ name: "Filial 2 - Bairro" })
    .returning();
  console.log("Stores created.");

  // Create products - principais produtos do histórico de vendas
  await db.insert(products).values([
    { name: "Bolo Gelado de Ninho", isClassA: true },
    { name: "Bolo Vulcão Fatia", isClassA: true },
    { name: "Empada de Camarão", isClassA: true },
    { name: "Empada de Frango", isClassA: true },
    { name: "Empadão de Frango Inteiro", isClassA: true },
    { name: "Esfirra de Carne", isClassA: true },
    { name: "Mini Bolo de Cenoura e Chocolate", isClassA: true },
    { name: "Mini Bolo de Chocolate", isClassA: true },
    { name: "Mini Bolo Vulcão de Chocolate e Ninho", isClassA: true },
    { name: "Paozinho de Batata com Queijo Cuia", isClassA: true },
    { name: "Torta de Cupuaçu 30 cm", isClassA: true },
    { name: "Torta Morango 30cm", isClassA: true },
    { name: "Torta Nega Maluca 30cm", isClassA: true },
    { name: "Torta Paraense 30cm", isClassA: true },
    { name: "Torta Salgada Inteira", isClassA: true },
    { name: "Trança de Queijo e Presunto", isClassA: true },
  ]);
  console.log("Products created.");

  // Create users
  const ownerPassword = await bcrypt.hash("123", 10);
  await db.insert(users).values({
    name: "Dono",
    email: "dono@confeitaria.com",
    username: "dono",
    passwordHash: ownerPassword,
    role: "owner",
  });

  const supervisorPassword = await bcrypt.hash("123", 10);
  await db.insert(users).values({
    name: "Supervisor",
    email: "supervisor@confeitaria.com",
    username: "supervisor",
    passwordHash: supervisorPassword,
    role: "supervisor",
  });

  const manager1Password = await bcrypt.hash("123", 10);
  await db.insert(users).values({
    name: "Gerente Loja 1",
    email: "gerente1@confeitaria.com",
    username: "gerente1",
    passwordHash: manager1Password,
    role: "manager",
    storeId: store1[0].id,
  });

  const manager2Password = await bcrypt.hash("123", 10);
  await db.insert(users).values({
    name: "Gerente Loja 2",
    email: "gerente2@confeitaria.com",
    username: "gerente2",
    passwordHash: manager2Password,
    role: "manager",
    storeId: store2[0].id,
  });
  console.log("Users created.");

  console.log("Seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
