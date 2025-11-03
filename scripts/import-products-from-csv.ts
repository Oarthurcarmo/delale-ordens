import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { products, productForecasts } from "../src/server/schema";
import { parseProductForecastsFromDefault } from "../src/lib/csv-parser";

const db = drizzle(process.env.DATABASE_URL!);

async function importProductsFromCSV() {
  console.log("📊 Starting CSV import...");
  console.log("📁 Reading data/dados_treinamento_delale.csv\n");

  try {
    // Parse the CSV data
    const productData = parseProductForecastsFromDefault();

    console.log(`Found ${productData.length} products in CSV\n`);

    // Insert products and their forecasts
    for (const item of productData) {
      console.log(
        `Importing: ${item.name} (avg daily forecast: ${item.averageDailyForecast})`
      );

      // Insert product
      const [insertedProduct] = await db
        .insert(products)
        .values({
          name: item.name,
          isClassA: true, // All CSV products are Class A
        })
        .returning();

      // Insert forecast for this product
      await db.insert(productForecasts).values({
        productId: insertedProduct.id,
        averageDailyForecast: item.averageDailyForecast,
      });
    }

    console.log("\n✅ Import completed successfully!");
    console.log(`📦 Imported ${productData.length} products with forecasts`);
    console.log(
      "🎯 All products marked as Class A for order creation\n"
    );

    // Display summary
    console.log("Product Summary:");
    console.log("━".repeat(60));
    for (const item of productData) {
      console.log(
        `  ${item.name.padEnd(40)} → ${item.averageDailyForecast} units/day`
      );
    }
    console.log("━".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ Error importing products:", error);
    throw error;
  }
}

// Run the import
importProductsFromCSV()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

