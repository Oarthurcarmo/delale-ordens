import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import {
  editRequests,
  orderItems,
  orders,
  salesHistory,
  products,
  productForecasts,
  orderItemEditRequests,
} from "../src/server/schema";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

async function resetDatabase() {
  console.log("🗑️  Starting database reset...");
  console.log("⚠️  This will delete all orders, products, and related data.");
  console.log("✅ Users and stores will be preserved.\n");

  try {
    // Delete in order to respect foreign key constraints
    console.log("Deleting order item edit requests...");
    await db.delete(orderItemEditRequests);

    console.log("Deleting edit requests...");
    await db.delete(editRequests);

    console.log("Deleting order items...");
    await db.delete(orderItems);

    console.log("Deleting orders...");
    await db.delete(orders);

    console.log("Deleting sales history...");
    await db.delete(salesHistory);

    console.log("Deleting product forecasts...");
    await db.delete(productForecasts);

    console.log("Deleting products...");
    await db.delete(products);

    // Reset sequences for clean IDs
    console.log("\nResetting ID sequences...");
    await db.execute(sql`ALTER SEQUENCE products_id_seq RESTART WITH 1`);
    await db.execute(
      sql`ALTER SEQUENCE product_forecasts_id_seq RESTART WITH 1`
    );
    await db.execute(sql`ALTER SEQUENCE sales_history_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE order_items_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE edit_requests_id_seq RESTART WITH 1`);
    await db.execute(
      sql`ALTER SEQUENCE order_item_edit_requests_id_seq RESTART WITH 1`
    );

    console.log("\n✅ Database reset completed successfully!");
    console.log("👥 Users and stores remain intact.");
    console.log(
      "📊 Ready for fresh product data from CSV import.\n"
    );
  } catch (error) {
    console.error("\n❌ Error resetting database:", error);
    throw error;
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

