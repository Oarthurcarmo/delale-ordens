import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { products, salesHistory } from "../src/server/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const db = drizzle(process.env.DATABASE_URL!);

// Mapeamento dos meses para garantir consistência
const monthMap: { [key: string]: string } = {
  jan: "jan",
  fev: "fev",
  mar: "mar",
  abr: "abr",
  mai: "mai",
  jun: "jun",
  jul: "jul",
  ago: "ago",
  set: "set",
  out: "out",
  nov: "nov",
  dez: "dez",
};

async function main() {
  console.log("Iniciando importação do histórico de vendas...");

  // Ler o arquivo CSV
  const csvPath = path.join(__dirname, "../docs/historico_vendas_produto.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");

  // Parsear o CSV (separado por ponto-e-vírgula)
  const lines = csvContent.split("\n").filter((line) => line.trim());
  const headers = lines[0].split(";");

  console.log(`Encontradas ${lines.length - 1} linhas de dados.`);

  // Buscar todos os produtos existentes
  const existingProducts = await db.select().from(products);
  const productMap = new Map(
    existingProducts.map((p) => [p.name.toUpperCase(), p.id])
  );

  console.log(`Produtos existentes no banco: ${existingProducts.length}`);

  // Coletar nomes únicos de produtos do CSV
  const productNamesInCSV = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [productName] = line.split(";");
    if (productName) {
      productNamesInCSV.add(productName.trim().toUpperCase());
    }
  }

  console.log(`Produtos únicos no CSV: ${productNamesInCSV.size}`);

  // Criar produtos que não existem
  const newProducts: string[] = [];
  for (const productName of productNamesInCSV) {
    if (!productMap.has(productName)) {
      newProducts.push(productName);
    }
  }

  if (newProducts.length > 0) {
    console.log(`Criando ${newProducts.length} novos produtos...`);

    for (const productName of newProducts) {
      const [insertedProduct] = await db
        .insert(products)
        .values({
          name: productName.charAt(0) + productName.slice(1).toLowerCase(),
          isClassA: true, // Você pode ajustar isso conforme necessário
        })
        .returning();

      productMap.set(productName, insertedProduct.id);
      console.log(
        `  - Produto criado: ${productName} (ID: ${insertedProduct.id})`
      );
    }
  }

  // Processar linhas do CSV e inserir histórico de vendas
  console.log("\nImportando dados de histórico de vendas...");

  const salesData: Array<{
    productId: number;
    year: number;
    month: string;
    total: number;
  }> = [];

  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const [productName, yearStr, monthStr, totalStr] = line.split(";");

      if (!productName || !yearStr || !monthStr || !totalStr) {
        console.warn(`Linha ${i + 1}: Dados incompletos - pulando`);
        errorCount++;
        continue;
      }

      const productId = productMap.get(productName.trim().toUpperCase());
      if (!productId) {
        console.warn(`Linha ${i + 1}: Produto não encontrado: ${productName}`);
        errorCount++;
        continue;
      }

      const year = parseInt(yearStr.trim());
      const month = monthMap[monthStr.trim().toLowerCase()];
      const total = parseInt(totalStr.trim());

      if (isNaN(year) || isNaN(total) || !month) {
        console.warn(`Linha ${i + 1}: Dados inválidos - pulando`);
        errorCount++;
        continue;
      }

      salesData.push({
        productId,
        year,
        month,
        total,
      });

      successCount++;
    } catch (error) {
      console.error(`Erro ao processar linha ${i + 1}:`, error);
      errorCount++;
    }
  }

  console.log(
    `\nDados processados: ${successCount} sucesso, ${errorCount} erros`
  );

  // Inserir dados em lotes para melhor performance
  if (salesData.length > 0) {
    console.log(
      `\nInserindo ${salesData.length} registros no banco de dados...`
    );

    const batchSize = 100;
    for (let i = 0; i < salesData.length; i += batchSize) {
      const batch = salesData.slice(i, i + batchSize);
      await db.insert(salesHistory).values(batch);
      console.log(
        `  Inseridos ${Math.min(i + batchSize, salesData.length)}/${salesData.length} registros`
      );
    }

    console.log("✓ Histórico de vendas importado com sucesso!");
  }

  // Estatísticas finais
  const totalRecords = await db.select().from(salesHistory);
  console.log(`\n=== Resumo ===`);
  console.log(
    `Total de produtos no banco: ${existingProducts.length + newProducts.length}`
  );
  console.log(`Total de registros de histórico: ${totalRecords.length}`);
  console.log(`Anos cobertos: 2022-2025`);

  console.log("\n✓ Importação concluída com sucesso!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro durante a importação:", err);
  process.exit(1);
});
