"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

interface SummaryData {
  ordersByStore: Array<{
    storeName: string;
    count: number;
  }>;
  topProducts: Array<{
    productName: string;
    totalQuantity: number;
  }>;
}

const COLORS = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#9D4EDD"];

export function OwnerDashboard() {
  const { data, error, isLoading } = useSWR<SummaryData>(
    "/api/dashboard/summary",
    fetcher,
    {
      refreshInterval: 60000, // Atualiza a cada minuto
    }
  );

  const [periodFilter, setPeriodFilter] = useState("all");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  const totalOrders =
    data?.ordersByStore.reduce((sum, store) => sum + Number(store.count), 0) ||
    0;
  const totalProducts =
    data?.topProducts.reduce(
      (sum, product) => sum + Number(product.totalQuantity),
      0
    ) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Dashboard Gerencial</h2>
          <p className="text-muted-foreground">
            Análise de pedidos de todas as lojas.
          </p>
        </div>
        <div className="w-48">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o Período</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="90days">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-2">
              De todas as filiais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Unidades pedidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Filiais Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data?.ordersByStore.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Com pedidos no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Loja</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.ordersByStore.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.ordersByStore}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="storeName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#FF6B6B" name="Pedidos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Pedidos (Unidades)</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.topProducts}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="totalQuantity"
                    label={(entry) => entry.productName as string}
                  >
                    {data.topProducts.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Filial</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.ordersByStore.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filial</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ordersByStore.map((store, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {store.storeName}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{store.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado disponível
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.topProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topProducts.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {product.productName}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{product.totalQuantity}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado disponível
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
