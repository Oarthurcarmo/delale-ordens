import { Suspense } from "react";
import {
  DailyInsightCard,
  InsightHistory,
} from "@/components/dashboards/DailyInsightCard";
import {
  SalesHistoryChart,
  SalesSummary,
} from "@/components/dashboards/SalesHistoryChart";

export default function InsightsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Insights de Vendas
        </h1>
        <p className="text-muted-foreground">
          Análises diárias geradas por IA baseadas no histórico de vendas
        </p>
      </div>

      {/* Insight do Dia - Destaque */}
      <section>
        <Suspense
          fallback={<div className="animate-pulse bg-muted h-48 rounded-lg" />}
        >
          <DailyInsightCard />
        </Suspense>
      </section>

      {/* Grid com Histórico e Gráfico */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense
          fallback={<div className="animate-pulse bg-muted h-96 rounded-lg" />}
        >
          <InsightHistory />
        </Suspense>

        <Suspense
          fallback={<div className="animate-pulse bg-muted h-96 rounded-lg" />}
        >
          <SalesHistoryChart />
        </Suspense>
      </section>

      {/* Resumo de Vendas */}
      <section>
        <Suspense
          fallback={<div className="animate-pulse bg-muted h-96 rounded-lg" />}
        >
          <SalesSummary year={new Date().getFullYear()} />
        </Suspense>
      </section>

      {/* Informações Adicionais */}
      <section className="bg-muted/30 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Como Funciona</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="text-2xl">🔍</span>
              <span>Análise Automática</span>
            </div>
            <p className="text-muted-foreground">
              A IA analisa todo o histórico de vendas, identificando padrões,
              tendências e sazonalidades.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="text-2xl">💡</span>
              <span>Insight Diário</span>
            </div>
            <p className="text-muted-foreground">
              Um novo insight é gerado automaticamente a cada dia, baseado na
              data atual e contexto do negócio.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="text-2xl">🎯</span>
              <span>Ações Práticas</span>
            </div>
            <p className="text-muted-foreground">
              Cada insight inclui sugestões acionáveis para melhorar vendas,
              controlar custos ou aproveitar oportunidades.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-2">
          <h4 className="font-medium">Tipos de Análises:</h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span>📊</span>
              <span>
                <strong>Sazonalidade:</strong> Identifica meses fortes e fracos
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>📈</span>
              <span>
                <strong>Crescimento:</strong> Compara com períodos anteriores
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>🏆</span>
              <span>
                <strong>Top Produtos:</strong> Destaca os mais vendidos
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>📅</span>
              <span>
                <strong>Período:</strong> Analisa quinzenas e dias do mês
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
