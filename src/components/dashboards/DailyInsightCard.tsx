"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface InsightData {
  success: boolean;
  insight: string;
  date: string;
}

export function DailyInsightCard() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");

  const fetchInsight = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/daily-insight");
      const data: InsightData = await response.json();

      if (data.success) {
        setInsight(data.insight);
        setDate(data.date);
      } else {
        setError("Erro ao carregar insight");
      }
    } catch (err) {
      console.error("Erro ao buscar insight:", err);
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Função para estruturar o insight em seções
  const parseInsight = (text: string) => {
    const recomendacoesIndex = text.indexOf("RECOMENDAÇÕES:");

    if (recomendacoesIndex > -1) {
      const contextoEAnalise = text.substring(0, recomendacoesIndex).trim();
      const recomendacoes = text
        .substring(recomendacoesIndex + "RECOMENDAÇÕES:".length)
        .trim();

      return {
        contextoEAnalise,
        recomendacoes,
      };
    }

    return {
      contextoEAnalise: text,
      recomendacoes: null,
    };
  };

  const estrutura = insight ? parseInsight(insight) : null;

  return (
    <Card className="border-l-4 border-l-amber-500 shadow-lg bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <span className="text-2xl">🎯</span>
              Assistente Estratégico de Vendas
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 rounded-full">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                IA
              </span>
              <span className="text-xs">{date && formatDate(date)}</span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInsight}
            disabled={loading}
            className="text-xs"
          >
            {loading ? "Carregando..." : "Atualizar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse space-y-3 w-full">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-4/6" />
              <div className="h-4 bg-muted rounded w-full mt-4" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchInsight} variant="outline" size="sm">
              Tentar Novamente
            </Button>
          </div>
        ) : estrutura ? (
          <div className="space-y-4">
            {/* Contexto e Análises */}
            <div className="space-y-3">
              <div className="text-sm leading-relaxed text-foreground/90">
                {estrutura.contextoEAnalise}
              </div>
            </div>

            {/* Recomendações em destaque */}
            {estrutura.recomendacoes && (
              <div className="bg-gradient-to-r from-amber-100 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-3 text-sm">
                      Ações Recomendadas para Hoje
                    </h4>
                    <ul className="space-y-3 text-sm leading-relaxed">
                      {estrutura.recomendacoes
                        .split(/\n/)
                        .filter((linha) => linha.trim())
                        .map((item, index) => {
                          // Detectar tipo de recomendação
                          const isProducao = item.includes("[PRODUÇÃO]");
                          const isAcaoComercial =
                            item.includes("[AÇÃO COMERCIAL]");
                          const isControle = item.includes("[CONTROLE]");
                          const isEstrategia = item.includes("[ESTRATÉGIA]");

                          // Definir cor do badge
                          const badgeColor = isProducao
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            : isAcaoComercial
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : isControle
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";

                          // Remover tag do texto
                          const textoLimpo = item
                            .replace(/\[PRODUÇÃO\]/g, "")
                            .replace(/\[AÇÃO COMERCIAL\]/g, "")
                            .replace(/\[CONTROLE\]/g, "")
                            .replace(/\[ESTRATÉGIA\]/g, "")
                            .trim();

                          return (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-amber-600 dark:text-amber-400 font-bold flex-shrink-0 mt-0.5">
                                {item.match(/^\d+\)/) ? "" : "•"}
                              </span>
                              <div className="flex-1 space-y-1">
                                {(isProducao ||
                                  isAcaoComercial ||
                                  isControle ||
                                  isEstrategia) && (
                                  <span
                                    className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}
                                  >
                                    {isProducao && "📦 PRODUÇÃO"}
                                    {isAcaoComercial && "🎯 AÇÃO COMERCIAL"}
                                    {isControle && "⚙️ CONTROLE"}
                                    {isEstrategia && "💡 ESTRATÉGIA"}
                                  </span>
                                )}
                                <span className="block text-amber-800 dark:text-amber-300">
                                  {textoLimpo}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Footer com info */}
            <div className="pt-4 border-t flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Gerado por IA
              </span>
              <span>•</span>
              <span>Análise de sazonalidade</span>
              <span>•</span>
              <span>Tendências quinzenais</span>
              <span>•</span>
              <span>Crescimento ano a ano</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface InsightHistoryItem {
  id: number;
  date: string;
  insight: string;
  createdAt: string;
}

interface InsightHistoryData {
  success: boolean;
  insights: InsightHistoryItem[];
}

export function InsightHistory() {
  const [insights, setInsights] = useState<InsightHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/daily-insight/history?limit=7");
        const data: InsightHistoryData = await response.json();

        if (data.success) {
          setInsights(data.insights);
        } else {
          setError("Erro ao carregar histórico");
        }
      } catch (err) {
        console.error("Erro ao buscar histórico:", err);
        setError("Erro ao conectar com o servidor");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Insights</CardTitle>
        <CardDescription>Últimos 7 dias de análises</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-3 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-destructive py-6">{error}</p>
        ) : insights.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            Nenhum histórico disponível ainda
          </p>
        ) : (
          <div className="space-y-6">
            {insights.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  {formatDate(item.date)}
                </div>
                <p className="text-sm leading-relaxed">{item.insight}</p>
                <hr className="last:hidden" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
