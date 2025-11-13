import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import {
  products,
  productForecasts,
  salesHistory,
  orderItems,
  orderItemEditRequests,
  editRequests,
  orders,
  dailyOrderHistory,
  dailyForecasts,
} from "../src/server/schema";
import fs from "fs";
import path from "path";

const db = drizzle(process.env.DATABASE_URL!);

interface ProductData {
  name: string;
  averageDailyForecast: number;
  monthlyData: Array<{
    month: string;
    year: number;
    daysInMonth: number;
    period: number;
    totalForecast: number;
    dailyForecasts: number[];
  }>;
}

/**
 * Parse o CSV delale_patio_belem.csv
 * Formato: Produto;Quantidade de dias no mês;Mês;Período;Quantidade de Produto prevista para venda no mês;Dia 1;...;Dia 31
 */
function parseDelalePatioBelemCSV(csvPath: string): ProductData[] {
  console.log(`📖 Lendo arquivo: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").filter((line) => line.trim());

  // Pular linha de cabeçalho
  const dataLines = lines.slice(1);

  // Agrupar por produto
  const productMap = new Map<string, ProductData>();

  for (const line of dataLines) {
    const parts = line.split(";");
    if (parts.length < 6) continue;

    const productName = parts[0].trim();
    if (!productName) continue;

    const daysInMonth = parseInt(parts[1]);
    const monthYear = parts[2].trim(); // ex: "set/25"
    const period = parseInt(parts[3]);
    const totalForecast = parseInt(parts[4]);

    if (isNaN(daysInMonth) || isNaN(totalForecast) || isNaN(period)) {
      continue;
    }

    // Extrair previsões diárias (colunas 5 em diante)
    const dailyForecasts: number[] = [];
    for (let i = 5; i < parts.length && i < 5 + 31; i++) {
      const value = parts[i].trim();
      if (value) {
        const dailyValue = parseInt(value);
        if (!isNaN(dailyValue)) {
          dailyForecasts.push(dailyValue);
        }
      }
    }

    // Parsear mês/ano
    const [monthStr, yearStr] = monthYear.split("/");
    const monthMap: { [key: string]: string } = {
      jan: "Jan",
      fev: "Feb",
      mar: "Mar",
      abr: "Apr",
      mai: "May",
      jun: "Jun",
      jul: "Jul",
      ago: "Aug",
      set: "Sep",
      out: "Oct",
      nov: "Nov",
      dez: "Dec",
    };
    const month = monthMap[monthStr.toLowerCase()] || monthStr;
    const year = 2000 + parseInt(yearStr);

    // Inicializar produto se não existir
    if (!productMap.has(productName)) {
      productMap.set(productName, {
        name: productName,
        averageDailyForecast: 0,
        monthlyData: [],
      });
    }

    const productData = productMap.get(productName)!;
    productData.monthlyData.push({
      month,
      year,
      daysInMonth,
      period,
      totalForecast,
      dailyForecasts,
    });
  }

  // Calcular média diária para cada produto
  const results: ProductData[] = [];
  for (const [name, data] of productMap.entries()) {
    const totalSum = data.monthlyData.reduce(
      (sum, m) => sum + m.totalForecast,
      0
    );
    const totalDays = data.monthlyData.reduce(
      (sum, m) => sum + m.daysInMonth,
      0
    );
    data.averageDailyForecast = Math.round(totalSum / totalDays);
    results.push(data);
  }

  // Ordenar alfabeticamente
  results.sort((a, b) => a.name.localeCompare(b.name));

  return results;
}

async function importDelalePatioBelemData() {
  console.log("🔄 Iniciando importação dos dados do Pátio Belém...\n");

  try {
    const csvPath = path.join(
      process.cwd(),
      "data",
      "delale_patio_belem.csv"
    );

    // Parse CSV
    const productData = parseDelalePatioBelemCSV(csvPath);
    console.log(`✅ Encontrados ${productData.length} produtos no CSV\n`);

    // Limpar dados existentes (na ordem correta devido às foreign keys)
    console.log("🗑️  Limpando dados existentes...");
    console.log("   → Removendo solicitações de edição de itens...");
    await db.delete(orderItemEditRequests);
    console.log("   → Removendo solicitações de edição de pedidos...");
    await db.delete(editRequests);
    console.log("   → Removendo itens de pedidos...");
    await db.delete(orderItems);
    console.log("   → Removendo pedidos...");
    await db.delete(orders);
    console.log("   → Removendo histórico diário de pedidos...");
    await db.delete(dailyOrderHistory);
    console.log("   → Removendo histórico de vendas...");
    await db.delete(salesHistory);
    console.log("   → Removendo previsões diárias...");
    await db.delete(dailyForecasts);
    console.log("   → Removendo previsões de produtos...");
    await db.delete(productForecasts);
    console.log("   → Removendo produtos...");
    await db.delete(products);
    console.log("✅ Dados antigos removidos\n");

    // Produtos que NÃO estão disponíveis para encomenda (apenas vitrine)
    const noOrderProducts = [
      "BOLO GELADO DE NINHO",
      "BOLO VULCAO FATIA",
      "EMPADA DE FRANGO",
      "ESFIRRA DE CARNE",
      "TRANCA DE QUEIJO E PRESUNTO",
    ];

    // Inserir novos produtos e previsões
    console.log("📦 Importando novos produtos e previsões...\n");

    for (const item of productData) {
      const allowOrders = !noOrderProducts.includes(item.name.toUpperCase());
      const orderStatus = allowOrders ? "✓" : "✗";
      
      console.log(
        `   ${orderStatus} ${item.name.padEnd(45)} (Média: ${item.averageDailyForecast} unidades/dia)`
      );

      // Inserir produto
      const [insertedProduct] = await db
        .insert(products)
        .values({
          name: item.name,
          isClassA: true, // Todos os produtos do CSV são Classe A
          allowOrders: allowOrders,
        })
        .returning();

      // Inserir previsão
      await db.insert(productForecasts).values({
        productId: insertedProduct.id,
        averageDailyForecast: item.averageDailyForecast,
      });

      // Inserir histórico de vendas (usando os dados mensais)
      for (const monthData of item.monthlyData) {
        await db.insert(salesHistory).values({
          productId: insertedProduct.id,
          year: monthData.year,
          month: monthData.month,
          total: monthData.totalForecast,
        });

        // Inserir previsões diárias específicas
        const monthMap: { [key: string]: number } = {
          Jan: 0,
          Feb: 1,
          Mar: 2,
          Apr: 3,
          May: 4,
          Jun: 5,
          Jul: 6,
          Aug: 7,
          Sep: 8,
          Oct: 9,
          Nov: 10,
          Dec: 11,
        };

        const monthIndex = monthMap[monthData.month];
        if (monthIndex !== undefined) {
          for (let dayIndex = 0; dayIndex < monthData.dailyForecasts.length; dayIndex++) {
            const dayNumber = dayIndex + 1;
            const forecastDate = new Date(
              monthData.year,
              monthIndex,
              dayNumber
            );
            const quantity = monthData.dailyForecasts[dayIndex];

            await db.insert(dailyForecasts).values({
              productId: insertedProduct.id,
              forecastDate: forecastDate.toISOString().split("T")[0],
              quantity: quantity,
            });
          }
        }
      }
    }

    // Calcular total de previsões diárias
    const totalDailyForecasts = productData.reduce((sum, p) => {
      return (
        sum +
        p.monthlyData.reduce(
          (monthSum, m) => monthSum + m.dailyForecasts.length,
          0
        )
      );
    }, 0);

    // Contar produtos com e sem encomenda
    const productsWithOrders = productData.filter(
      (p) => !noOrderProducts.includes(p.name.toUpperCase())
    ).length;
    const productsWithoutOrders = productData.length - productsWithOrders;

    console.log("\n" + "━".repeat(70));
    console.log("✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!");
    console.log("━".repeat(70));
    console.log(`📦 Total de produtos importados: ${productData.length}`);
    console.log(
      `   ✓ Disponíveis para encomenda: ${productsWithOrders}`
    );
    console.log(
      `   ✗ Apenas vitrine: ${productsWithoutOrders}`
    );
    console.log(
      `📊 Total de registros de histórico mensal: ${productData.reduce(
        (sum, p) => sum + p.monthlyData.length,
        0
      )}`
    );
    console.log(
      `📅 Total de previsões diárias importadas: ${totalDailyForecasts}`
    );
    console.log("🎯 Todos os produtos marcados como Classe A");
    console.log(
      "✨ Sistema agora possui previsões específicas por dia!"
    );
    console.log("━".repeat(70) + "\n");

    // Exibir resumo
    console.log("📋 RESUMO DOS PRODUTOS:");
    console.log("━".repeat(70));
    for (const item of productData) {
      const allowOrders = !noOrderProducts.includes(item.name.toUpperCase());
      const orderIcon = allowOrders ? "✓" : "✗";
      console.log(
        `  ${orderIcon} ${item.name.padEnd(43)} → ${String(
          item.averageDailyForecast
        ).padStart(3)} unidades/dia`
      );
    }
    console.log("━".repeat(70));
    console.log("  ✓ = Disponível para encomenda | ✗ = Apenas vitrine");
    console.log("━".repeat(70) + "\n");
  } catch (error) {
    console.error("\n❌ Erro durante a importação:", error);
    throw error;
  }
}

// Executar importação
importDelalePatioBelemData()
  .then(() => {
    console.log("✨ Processo finalizado!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha na importação:", error);
    process.exit(1);
  });

