import { db } from "./db";
import { dailyInsight, salesHistory, products } from "./schema";
import { eq, sql, and, gte } from "drizzle-orm";

interface SalesAnalysis {
  topProducts: Array<{ name: string; total: number }>;
  monthlyTrends: Array<{ month: string; total: number }>;
  yearOverYearGrowth: Array<{ product: string; growth: number }>;
  currentMonth: string;
  currentDay: number;
}

/**
 * Analisa os dados de vendas para gerar contexto para a IA
 */
async function analyzeSalesData(): Promise<SalesAnalysis> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleDateString("pt-BR", { month: "short" });
  const currentDay = now.getDate();

  // Top produtos do ano atual
  const topProducts = await db
    .select({
      name: products.name,
      total: sql<number>`SUM(${salesHistory.total})`.as("total"),
    })
    .from(salesHistory)
    .innerJoin(products, eq(salesHistory.productId, products.id))
    .where(eq(salesHistory.year, currentYear))
    .groupBy(products.name)
    .orderBy(sql`SUM(${salesHistory.total}) DESC`)
    .limit(5);

  // Tendências mensais (últimos 12 meses disponíveis)
  const monthlyTrends = await db
    .select({
      month: salesHistory.month,
      total: sql<number>`SUM(${salesHistory.total})`.as("total"),
    })
    .from(salesHistory)
    .where(
      and(
        gte(salesHistory.year, currentYear - 1),
        sql`${salesHistory.year} * 12 + CASE ${salesHistory.month}
          WHEN 'jan' THEN 1 WHEN 'fev' THEN 2 WHEN 'mar' THEN 3
          WHEN 'abr' THEN 4 WHEN 'mai' THEN 5 WHEN 'jun' THEN 6
          WHEN 'jul' THEN 7 WHEN 'ago' THEN 8 WHEN 'set' THEN 9
          WHEN 'out' THEN 10 WHEN 'nov' THEN 11 WHEN 'dez' THEN 12
        END >= ${(currentYear - 1) * 12 + now.getMonth() + 1}`
      )
    )
    .groupBy(salesHistory.month)
    .orderBy(sql`SUM(${salesHistory.total}) DESC`)
    .limit(12);

  // Crescimento ano a ano (comparando com ano anterior)
  const yearOverYearGrowth = await db.execute(sql`
    WITH current_year AS (
      SELECT 
        p.name as product,
        SUM(sh.total) as current_total
      FROM ${salesHistory} sh
      JOIN ${products} p ON p.id = sh.product_id
      WHERE sh.year = ${currentYear}
      GROUP BY p.name
    ),
    previous_year AS (
      SELECT 
        p.name as product,
        SUM(sh.total) as previous_total
      FROM ${salesHistory} sh
      JOIN ${products} p ON p.id = sh.product_id
      WHERE sh.year = ${currentYear - 1}
      GROUP BY p.name
    )
    SELECT 
      cy.product,
      ROUND(((cy.current_total - COALESCE(py.previous_total, 0)) * 100.0) / 
        NULLIF(COALESCE(py.previous_total, 1), 0), 2) as growth
    FROM current_year cy
    LEFT JOIN previous_year py ON cy.product = py.product
    ORDER BY growth DESC
    LIMIT 5
  `);

  return {
    topProducts: topProducts.map((p) => ({
      name: p.name,
      total: Number(p.total),
    })),
    monthlyTrends: monthlyTrends.map((t) => ({
      month: t.month,
      total: Number(t.total),
    })),
    yearOverYearGrowth: yearOverYearGrowth.rows.map((g) => ({
      product: g.product as string,
      growth: Number(g.growth),
    })),
    currentMonth,
    currentDay,
  };
}

/**
 * Gera o prompt para a IA com base nos dados analisados
 */
function generatePrompt(analysis: SalesAnalysis): string {
  const {
    topProducts,
    monthlyTrends,
    yearOverYearGrowth,
    currentMonth,
    currentDay,
  } = analysis;

  // Encontrar posição do mês atual no ranking
  const currentMonthRank = monthlyTrends.findIndex(
    (t) => t.month.toLowerCase() === currentMonth.toLowerCase()
  );
  const monthPerformance =
    currentMonthRank >= 0 && currentMonthRank < 4
      ? "forte"
      : currentMonthRank >= 8
        ? "fraco"
        : "moderado";

  return `# **Contexto: Assistente Estratégico de Vendas para Gerentes**

Você é um consultor de negócios especializado em confeitarias. Seu papel é analisar dados de vendas e fornecer insights DETALHADOS e ACIONÁVEIS que ajudem gerentes a tomar decisões estratégicas no dia a dia.

---

# **CONTEXTO ATUAL**

**Data:** ${new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}
**Dia do Mês:** ${currentDay}
**Mês:** ${currentMonth.toUpperCase()} (Mês ${monthPerformance} historicamente)
**Quinzena:** ${currentDay <= 15 ? "PRIMEIRA (1-15) - Período tradicionalmente FORTE" : "SEGUNDA (16-31) - Período tradicionalmente MAIS FRACO"}

---

# **ANÁLISE DE PERFORMANCE**

## **Top 5 Produtos do Ano**
${topProducts
  .map(
    (p, i) =>
      `${i + 1}. **${p.name}**: ${p.total.toLocaleString("pt-BR")} unidades`
  )
  .join("\n")}

## **Sazonalidade Mensal (Ranking de Vendas)**
${monthlyTrends
  .slice(0, 5)
  .map(
    (t, i) =>
      `${i + 1}. ${t.month.toUpperCase()}: ${t.total.toLocaleString("pt-BR")} unidades`
  )
  .join("\n")}

## **Crescimento Ano a Ano**
${yearOverYearGrowth
  .slice(0, 5)
  .map((g, i) => {
    const signal = g.growth > 0 ? "📈" : g.growth < 0 ? "📉" : "➡️";
    const status =
      g.growth > 20
        ? "EXCELENTE"
        : g.growth > 10
          ? "BOM"
          : g.growth > 0
            ? "LEVE"
            : g.growth > -10
              ? "ATENÇÃO"
              : "CRÍTICO";
    return `${i + 1}. ${g.product}: ${signal} ${g.growth > 0 ? "+" : ""}${g.growth}% [${status}]`;
  })
  .join("\n")}

---

# **SUA MISSÃO: GERAR INSIGHT ESTRATÉGICO COMPLETO**

Crie um insight estruturado em 4 PARTES OBRIGATÓRIAS:

## **1. CONTEXTO DO DIA** (1 frase)
- Informe o contexto atual: dia, quinzena, sazonalidade do mês
- Ex: "Hoje é dia 16, iniciando a segunda quinzena de outubro, um mês moderado."

## **2. ANÁLISE SAZONAL** (1-2 frases)
- Compare o mês atual com o histórico
- Indique se é período forte, fraco ou moderado
- Forneça dados específicos (% ou unidades)
- Ex: "Outubro ocupa a 6ª posição em vendas no ano. Historicamente, as vendas caem 8% na segunda quinzena."

## **3. ANÁLISE DE QUINZENA** (1-2 frases)
- Explique o comportamento da quinzena atual
- Se 1ª quinzena (1-15): momento de aproveitar período forte
- Se 2ª quinzena (16-31): alerta sobre queda típica e sugestão preventiva
- Ex: "A segunda quinzena apresenta queda média de 12% nas vendas. Clientes tendem a reduzir compras após o pagamento."

## **4. RECOMENDAÇÕES ESTRATÉGICAS** (4-6 ações OBRIGATÓRIAS)

### **A) QUANTIDADES DE PRODUÇÃO (3 produtos mínimo)**
- Calcule quantidade sugerida baseada em: média de vendas diárias do produto × fator de quinzena × fator sazonal
- Forneça números específicos e realistas
- Priorize os top 3 produtos mais vendidos
- Ex: "Produza 45-50 unidades de Torta Morango (média diária 42 unid, quinzena forte)"

### **B) AÇÕES COMERCIAIS E OPERACIONAIS**
- Sugestão de promoção ou combo (específica)
- Ação de controle de custos ou estoque
- Foco em produtos estratégicos

**FORMATO OBRIGATÓRIO DAS RECOMENDAÇÕES:**
1) [PRODUÇÃO] Produto A: X-Y unidades (justificativa)
2) [PRODUÇÃO] Produto B: X-Y unidades (justificativa)
3) [PRODUÇÃO] Produto C: X-Y unidades (justificativa)
4) [AÇÃO COMERCIAL] Promoção/Combo específico
5) [CONTROLE] Ação de custos/estoque
6) [ESTRATÉGIA] Foco em crescimento

**Exemplo:**
1) [PRODUÇÃO] Bolo Gelado de Ninho: 55-60 unidades (média diária 52 unid, 2ª quinzena: reduzir 10%)
2) [PRODUÇÃO] Torta Morango 30cm: 38-42 unidades (líder de vendas, manter estoque de segurança)
3) [PRODUÇÃO] Mini Bolo Chocolate: 70-75 unidades (alta demanda, crescimento +25%)
4) [AÇÃO COMERCIAL] Lance combo "Café da Tarde" (Bolo + Mini Bolo) com 15% desconto
5) [CONTROLE] Reduza 30% produção de produtos com queda >10% para evitar desperdício
6) [ESTRATÉGIA] Mantenha estoque mínimo de 20% dos top 3 produtos até o fim do dia

---

# **FORMATO DE SAÍDA**

Retorne o insight estruturado em UM ÚNICO PARÁGRAFO, mas com as 4 partes claramente identificáveis:

**ESTRUTURA:**
"[CONTEXTO]. [ANÁLISE SAZONAL]. [ANÁLISE DE QUINZENA]. [RECOMENDAÇÕES: 1) ... 2) ... 3) ...]"

**IMPORTANTE:**
- Use tom profissional mas acessível
- Seja específico com números e porcentagens
- Foque em AÇÕES PRÁTICAS que o gerente pode executar HOJE
- Não use formatação markdown (**, ##, etc)
- Retorne apenas o texto, sem cabeçalhos

**EXEMPLO DE RESPOSTA IDEAL:**
"Hoje é dia 18 de março, segunda quinzena de um mês moderado em vendas (7ª posição histórica). Março apresenta média 15% inferior aos meses de pico (dezembro e julho), mas 20% superior a fevereiro. A segunda quinzena historicamente registra queda de 12-15% nas vendas, com clientes mais cautelosos após despesas da primeira quinzena. RECOMENDAÇÕES:
1) [PRODUÇÃO] Bolo Gelado de Ninho: 48-52 unidades (média diária 55, reduzir 10% para 2ª quinzena)
2) [PRODUÇÃO] Torta Morango 30cm: 35-38 unidades (líder com 34.291 vendas/ano, manter estoque)
3) [PRODUÇÃO] Mini Bolo Chocolate: 65-70 unidades (crescimento +25%, alta demanda esperada)
4) [AÇÃO COMERCIAL] Lance promoção 'Leve 3, Pague 2' nos Mini Bolos para compensar queda sazonal
5) [CONTROLE] Reduza 30% produção de produtos em queda (Mini Bolo Vulcão -8%) para evitar desperdício
6) [ESTRATÉGIA] Garanta estoque de segurança (20%) dos top 3 produtos até o fim do expediente"`;
}

/**
 * Chama a API da IA para gerar o insight
 */
async function generateInsightWithAI(prompt: string): Promise<string> {
  const apiKey = process.env.AIML_API_KEY;

  if (!apiKey) {
    console.warn("AIML_API_KEY não configurada, retornando insight padrão");
    return "Configure a API Key da AIML API para gerar insights automáticos baseados em IA.";
  }

  try {
    const response = await fetch(
      "https://api.aimlapi.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-thinking-v3.2-exp",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          top_p: 0.7,
          frequency_penalty: 1,
          max_tokens: 1536,
          top_k: 50,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    const insight = data.choices[0]?.message?.content?.trim();

    if (!insight) {
      throw new Error("No insight generated");
    }

    return insight;
  } catch (error) {
    console.error("Erro ao gerar insight com IA:", error);
    // Fallback para insight baseado em regras simples
    return generateFallbackInsight(await analyzeSalesData());
  }
}

/**
 * Gera um insight básico sem IA (fallback)
 */
function generateFallbackInsight(analysis: SalesAnalysis): string {
  const {
    topProducts,
    currentDay,
    currentMonth,
    monthlyTrends,
    yearOverYearGrowth,
  } = analysis;

  const quinzena = currentDay <= 15 ? "primeira" : "segunda";
  const quinzenaTexto =
    currentDay <= 15
      ? "período tradicionalmente forte"
      : "período que costuma apresentar queda de 10-15% nas vendas";

  // Encontrar posição do mês
  const monthRank =
    monthlyTrends.findIndex(
      (t) => t.month.toLowerCase() === currentMonth.toLowerCase()
    ) + 1;
  const monthPerformance =
    monthRank <= 4 ? "forte" : monthRank >= 9 ? "fraco" : "moderado";

  const top1 = topProducts[0];
  const top2 = topProducts[1];
  const top3 = topProducts[2];

  const produtosCrescimento = yearOverYearGrowth.filter((g) => g.growth > 10);
  const produtosQueda = yearOverYearGrowth.filter((g) => g.growth < -10);

  // Construir insight estruturado
  let insight = `Hoje é dia ${currentDay} de ${currentMonth}, ${quinzena} quinzena de um mês ${monthPerformance} em vendas`;

  if (monthRank > 0) {
    insight += ` (${monthRank}ª posição no ranking histórico)`;
  }

  insight += `. `;

  // Análise sazonal
  if (monthPerformance === "forte") {
    insight += `${currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)} é um dos melhores meses para vendas. `;
  } else if (monthPerformance === "fraco") {
    insight += `${currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)} historicamente apresenta vendas mais baixas. `;
  } else {
    insight += `${currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)} mantém performance moderada de vendas. `;
  }

  // Análise de quinzena
  insight += `Estamos na ${quinzena} quinzena, ${quinzenaTexto}. `;

  if (currentDay === 16) {
    insight += `Clientes tendem a reduzir compras após despesas da primeira quinzena. `;
  } else if (currentDay === 1) {
    insight += `Início de mês é momento ideal para impulsionar vendas com energia renovada. `;
  }

  // Recomendações
  insight += `RECOMENDAÇÕES:\n`;

  const recomendacoes: string[] = [];

  // Função para calcular quantidade diária sugerida
  const calcularQuantidadeDiaria = (
    totalAnual: number,
    quinzena: string,
    monthPerformance: string
  ) => {
    // Média diária base (total anual / 365)
    let mediaDiaria = Math.round(totalAnual / 365);

    // Ajuste por quinzena (2ª quinzena: -12%)
    if (quinzena === "segunda") {
      mediaDiaria = Math.round(mediaDiaria * 0.88);
    }

    // Ajuste por sazonalidade do mês
    if (monthPerformance === "fraco") {
      mediaDiaria = Math.round(mediaDiaria * 0.85);
    } else if (monthPerformance === "forte") {
      mediaDiaria = Math.round(mediaDiaria * 1.15);
    }

    // Margem de segurança (±5%)
    const min = Math.max(1, Math.round(mediaDiaria * 0.95));
    const max = Math.round(mediaDiaria * 1.05);

    return { min, max, media: mediaDiaria };
  };

  // Recomendações 1-3: QUANTIDADES DE PRODUÇÃO (Top 3 produtos)
  if (top1) {
    const qty = calcularQuantidadeDiaria(
      top1.total,
      quinzena,
      monthPerformance
    );
    const justificativa =
      quinzena === "segunda"
        ? `média diária ${qty.media + Math.round(qty.media * 0.12)}, reduzir 12% para 2ª quinzena`
        : `líder com ${top1.total.toLocaleString("pt-BR")} vendas/ano, manter produção consistente`;
    recomendacoes.push(
      `1) [PRODUÇÃO] ${top1.name}: ${qty.min}-${qty.max} unidades (${justificativa})`
    );
  }

  if (top2) {
    const qty = calcularQuantidadeDiaria(
      top2.total,
      quinzena,
      monthPerformance
    );
    const crescimento = yearOverYearGrowth.find(
      (g) => g.product.toLowerCase() === top2.name.toLowerCase()
    );
    const justificativa = crescimento
      ? `2º mais vendido, crescimento ${crescimento.growth > 0 ? "+" : ""}${crescimento.growth.toFixed(0)}%`
      : `2º mais vendido com ${top2.total.toLocaleString("pt-BR")} vendas/ano`;
    recomendacoes.push(
      `2) [PRODUÇÃO] ${top2.name}: ${qty.min}-${qty.max} unidades (${justificativa})`
    );
  }

  if (top3) {
    const qty = calcularQuantidadeDiaria(
      top3.total,
      quinzena,
      monthPerformance
    );
    const justificativa =
      monthPerformance === "forte"
        ? `alta demanda em mês forte, garantir estoque extra`
        : `3º mais vendido, ajustar por sazonalidade`;
    recomendacoes.push(
      `3) [PRODUÇÃO] ${top3.name}: ${qty.min}-${qty.max} unidades (${justificativa})`
    );
  }

  // Recomendação 4: AÇÃO COMERCIAL (Promoção)
  if (top2) {
    if (quinzena === "segunda" || monthPerformance === "fraco") {
      recomendacoes.push(
        `4) [AÇÃO COMERCIAL] Lance promoção 'Leve 3, Pague 2' em ${top2.name} para compensar queda sazonal`
      );
    } else {
      recomendacoes.push(
        `4) [AÇÃO COMERCIAL] Crie combo '${top2.name} + ${top3?.name || "outro produto"}' com 15% desconto para aumentar ticket médio`
      );
    }
  }

  // Recomendação 5: CONTROLE (Custos/Produtos em queda)
  if (produtosQueda.length > 0) {
    recomendacoes.push(
      `5) [CONTROLE] Reduza 25-30% produção de produtos em queda (${produtosQueda.length} produtos) para evitar desperdício`
    );
  } else if (quinzena === "segunda") {
    recomendacoes.push(
      `5) [CONTROLE] Monitore custos operacionais nesta quinzena para manter margens acima de 30%`
    );
  } else {
    recomendacoes.push(
      `5) [CONTROLE] Mantenha controle rigoroso de estoque para evitar perdas por vencimento`
    );
  }

  // Recomendação 6: ESTRATÉGIA (Foco em crescimento)
  if (produtosCrescimento.length > 0) {
    const prod = produtosCrescimento[0];
    recomendacoes.push(
      `6) [ESTRATÉGIA] Invista em ${prod.product} (crescimento +${prod.growth.toFixed(0)}%), produto em alta com potencial de expansão`
    );
  } else if (top1) {
    recomendacoes.push(
      `6) [ESTRATÉGIA] Garanta estoque de segurança (20%) de ${top1.name} até o fim do expediente`
    );
  }

  insight += recomendacoes.join("\n") + ".";

  return insight;
}

/**
 * Busca o insight do dia (verifica cache ou gera novo)
 */
export async function getTodayInsight(): Promise<string> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Verificar se já existe insight para hoje
  const existing = await db
    .select()
    .from(dailyInsight)
    .where(eq(dailyInsight.date, today))
    .limit(1);

  if (existing.length > 0) {
    console.log("✓ Insight do dia encontrado no cache");
    return existing[0].insight;
  }

  // Gerar novo insight
  console.log("⚡ Gerando novo insight do dia...");

  const analysis = await analyzeSalesData();
  const prompt = generatePrompt(analysis);
  const insight = await generateInsightWithAI(prompt);

  // Salvar no banco
  await db.insert(dailyInsight).values({
    date: today,
    insight,
  });

  console.log("✓ Insight gerado e salvo com sucesso");
  return insight;
}

/**
 * Limpa insights antigos (manter apenas últimos 90 dias)
 */
export async function cleanupOldInsights(): Promise<number> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoffDate = ninetyDaysAgo.toISOString().split("T")[0];

  const deleted = await db
    .delete(dailyInsight)
    .where(sql`${dailyInsight.date} < ${cutoffDate}`)
    .returning();

  return deleted.length;
}
