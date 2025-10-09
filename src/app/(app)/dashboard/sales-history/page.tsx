import { Suspense } from "react";
import {
  SalesHistoryChart,
  ProductSalesChart,
  SalesSummary,
} from "@/components/dashboards/SalesHistoryChart";

export default function SalesHistoryPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Histórico de Vendas
        </h1>
        <p className="text-muted-foreground">
          Análise completa do histórico de vendas de produtos da confeitaria
        </p>
      </div>

      {/* Seção 1: Top Produtos por Ano */}
      <section>
        <Suspense
          fallback={<div className="animate-pulse bg-muted h-96 rounded-lg" />}
        >
          <SalesHistoryChart />
        </Suspense>
      </section>

      {/* Seção 2: Resumo Estatístico */}
      <section>
        <Suspense
          fallback={<div className="animate-pulse bg-muted h-96 rounded-lg" />}
        >
          <SalesSummary />
        </Suspense>
      </section>

      {/* Seção 3: Exemplos de Evolução de Produtos Individuais */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">
          Evolução de Produtos Específicos
        </h2>

        <div className="grid grid-cols-1 gap-6">
          <Suspense
            fallback={
              <div className="animate-pulse bg-muted h-96 rounded-lg" />
            }
          >
            {/* Você pode adicionar múltiplos gráficos de produtos aqui */}
            {/* Exemplo comentado - descomentar após ter os produtos no banco:
            <ProductSalesChart
              productId={12}
              productName="Bolo Gelado de Ninho"
              startYear={2022}
              endYear={2025}
            />
            
            <ProductSalesChart
              productId={23}
              productName="Torta Morango 30cm"
              startYear={2022}
              endYear={2025}
            />
            */}
          </Suspense>
        </div>
      </section>

      {/* Seção 4: Resumo por Ano */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Suspense
          fallback={<div className="animate-pulse bg-muted h-96 rounded-lg" />}
        >
          <SalesSummary year={2024} />
        </Suspense>

        <Suspense
          fallback={<div className="animate-pulse bg-muted h-96 rounded-lg" />}
        >
          <SalesSummary year={2023} />
        </Suspense>
      </section>

      {/* Informações Adicionais */}
      <section className="bg-muted/50 rounded-lg p-6 space-y-4">
        <h3 className="text-xl font-semibold">Sobre os Dados</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="font-medium">Período Coberto</p>
            <p className="text-muted-foreground">Janeiro/2022 - Agosto/2025</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium">Total de Produtos</p>
            <p className="text-muted-foreground">16 produtos únicos</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium">Registros de Histórico</p>
            <p className="text-muted-foreground">688 registros mensais</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Os dados são atualizados automaticamente a partir do histórico de
          vendas registrado no sistema.
        </p>
      </section>
    </div>
  );
}
