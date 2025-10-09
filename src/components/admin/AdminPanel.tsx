"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { StoresManager } from "@/components/admin/StoresManager";
import { UsersManager } from "@/components/admin/UsersManager";
import { Package, Store, Users } from "lucide-react";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Painel Administrativo</h2>
        <p className="text-muted-foreground">
          Gerencie produtos, lojas e usuários do sistema.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="stores" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Lojas
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <ProductsManager />
        </TabsContent>

        <TabsContent value="stores" className="space-y-4">
          <StoresManager />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
