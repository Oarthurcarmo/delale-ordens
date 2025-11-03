import fs from "fs";
import path from "path";

interface ProductForecastData {
  name: string;
  averageDailyForecast: number;
}

/**
 * Parse the CSV training data and extract product forecasts
 * Calculates the average daily forecast for each product across all months
 */
export function parseProductForecasts(csvPath: string): ProductForecastData[] {
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").filter((line) => line.trim());

  // Skip header line
  const dataLines = lines.slice(1);

  // Group by product name
  const productData = new Map<string, number[]>();

  for (const line of dataLines) {
    const parts = line.split(";");
    if (parts.length < 6) continue;

    const productName = parts[0].trim();
    const monthlyTotal = parseInt(parts[1]);
    const daysInMonth = parseInt(parts[2]);

    if (isNaN(monthlyTotal) || isNaN(daysInMonth) || daysInMonth === 0) {
      continue;
    }

    // Calculate daily average for this month
    const dailyAverage = monthlyTotal / daysInMonth;

    if (!productData.has(productName)) {
      productData.set(productName, []);
    }
    productData.get(productName)!.push(dailyAverage);
  }

  // Calculate overall average daily forecast for each product
  const results: ProductForecastData[] = [];

  for (const [name, dailyAverages] of productData.entries()) {
    const sum = dailyAverages.reduce((acc, val) => acc + val, 0);
    const averageDailyForecast = Math.round(sum / dailyAverages.length);

    results.push({
      name,
      averageDailyForecast,
    });
  }

  // Sort alphabetically
  results.sort((a, b) => a.name.localeCompare(b.name));

  return results;
}

/**
 * Get the default path to the CSV training data
 */
export function getDefaultCSVPath(): string {
  return path.join(process.cwd(), "data", "dados_treinamento_delale.csv");
}

/**
 * Parse product forecasts from the default CSV location
 */
export function parseProductForecastsFromDefault(): ProductForecastData[] {
  return parseProductForecasts(getDefaultCSVPath());
}

