"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SalesData {
  id: number;
  year: number;
  month: string;
  total: number;
  productName: string;
  productId: number;
  label: string;
}

interface TopProduct {
  productId: number;
  productName: string;
  totalSales: number;
}

const monthOrder = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function SalesHistoryChart() {
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sales-history?year=${selectedYear}`);
      const data = await response.json();
      setTopProducts(data.topProducts || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchTopProducts();
  }, [fetchTopProducts]);

  return (
    <div className="space-y-6">
      {/* Seletor de Ano */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas</CardTitle>
          <CardDescription>
            Análise de vendas por produto e período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border rounded-md"
            >
              <option value={2022}>2022</option>
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="productName"
                  angle={-45}
                  textAnchor="end"
                  height={150}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="totalSales"
                  fill="#8884d8"
                  name="Total de Vendas"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ProductSalesChartProps {
  productId: number;
  productName: string;
  startYear?: number;
  endYear?: number;
}

export function ProductSalesChart({
  productId,
  productName,
  startYear = 2022,
  endYear = 2025,
}: ProductSalesChartProps) {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProductSales = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/sales-history?productId=${productId}&startYear=${startYear}&endYear=${endYear}`
      );
      const data = await response.json();
      setSalesData(data.history || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [productId, startYear, endYear]);

  useEffect(() => {
    fetchProductSales();
  }, [fetchProductSales]);

  // Agrupar dados por ano
  const chartData = salesData.reduce((acc: SalesData[], item) => {
    const existingMonth = acc.find(
      (d) => d.month === item.month && d.year === item.year
    );
    if (existingMonth) {
      existingMonth.total += item.total;
    } else {
      acc.push({
        id: 0,
        productName: "",
        productId: 0,
        month: item.month,
        year: item.year,
        total: item.total,
        label: `${item.month}/${item.year}`,
      });
    }
    return acc;
  }, []);

  // Ordenar por ano e mês
  chartData.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de Vendas - {productName}</CardTitle>
        <CardDescription>
          Período: {startYear} - {endYear}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              Nenhum dado disponível para este período
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#8884d8"
                strokeWidth={2}
                name="Vendas"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface SalesSummaryProps {
  year?: number;
}

interface SummaryData {
  productId: number;
  productName: string;
  totalSales: number;
  avgMonthlySales: number;
  minSales: number;
  maxSales: number;
}

export function SalesSummary({ year }: SalesSummaryProps) {
  const [summary, setSummary] = useState<SummaryData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const url = year
        ? `/api/sales-history?year=${year}`
        : `/api/sales-history`;
      const response = await fetch(url);
      const data = await response.json();
      setSummary(data.summary || data.topProducts || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo de Vendas</CardTitle>
        <CardDescription>
          {year ? `Ano ${year}` : "Todos os períodos"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Produto</th>
                  <th className="text-right py-2">Total Vendas</th>
                  {!year && (
                    <>
                      <th className="text-right py-2">Média Mensal</th>
                      <th className="text-right py-2">Mín</th>
                      <th className="text-right py-2">Máx</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {summary.map((item) => (
                  <tr
                    key={item.productId}
                    className="border-b hover:bg-muted/50"
                  >
                    <td className="py-2">{item.productName}</td>
                    <td className="text-right py-2">
                      {item.totalSales?.toLocaleString("pt-BR")}
                    </td>
                    {!year && (
                      <>
                        <td className="text-right py-2">
                          {typeof item.avgMonthlySales === "number"
                            ? item.avgMonthlySales.toFixed(0)
                            : Number(item.avgMonthlySales || 0).toFixed(0)}
                        </td>
                        <td className="text-right py-2">
                          {item.minSales?.toLocaleString("pt-BR")}
                        </td>
                        <td className="text-right py-2">
                          {item.maxSales?.toLocaleString("pt-BR")}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
