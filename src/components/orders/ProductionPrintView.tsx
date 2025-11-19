import { Order } from "@/app/(app)/dashboard/orders-overview/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ProductionPrintViewProps {
  orders: Order[];
  dateFilter?: string;
}

type StoreKey = "MT" | "P" | "G" | "M" | "Outros";

const STORE_MAPPING: Record<string, StoreKey> = {
  matriz: "MT",
  pátio: "P",
  patio: "P",
  grão: "G",
  grao: "G",
  metrópole: "M",
  metropole: "M",
};

const getStoreKey = (storeName: string): string => {
  const lowerName = storeName.toLowerCase();
  for (const [key, value] of Object.entries(STORE_MAPPING)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  return storeName.substring(0, 3).toUpperCase();
};

const CATEGORIES = {
  DOCES: [
    "bolo",
    "brownie",
    "cupcake",
    "docinho",
    "fatia",
    "macarron",
    "mini bolo",
    "taça",
    "tartelete",
    "torta", // Torta can be doce or salgada, handled below
    "trufa",
    "brigadeiro",
    "mousse",
    "pudim",
    "crunch",
    "morango do amor",
  ],
  SALGADOS: [
    "burguer",
    "empada",
    "empadão",
    "esfirra",
    "folar",
    "pão de batata",
    "torta salgada",
    "quiche",
    "salgado",
    "trança",
  ],
  VEGANOS: ["vegano", "vegana"],
  "SEM GLÚTEN": ["sem glúten", "gluten free"],
};

const getCategory = (productName: string): string => {
  const lowerName = productName.toLowerCase();

  if (
    lowerName.includes("sem glúten") ||
    lowerName.includes("gluten free")
  ) {
    return "SEM GLÚTEN";
  }
  
  if (lowerName.includes("vegano") || lowerName.includes("vegana")) {
    return "VEGANOS";
  }

  if (lowerName.includes("torta salgada")) {
    return "SALGADOS";
  }

  for (const keyword of CATEGORIES.SALGADOS) {
    if (lowerName.includes(keyword)) return "SALGADOS";
  }

  for (const keyword of CATEGORIES.DOCES) {
    if (lowerName.includes(keyword)) return "DOCES";
  }

  return "OUTROS"; // Default category
};

export function ProductionPrintView({ orders, dateFilter }: ProductionPrintViewProps) {
  // Aggregate data
  // Map<Category, Map<ProductName, Map<StoreKey, Quantity>>>
  const data = new Map<
    string,
    Map<string, Map<string, number>>
  >();

  // Initialize stores set to know which columns to render dynamically if needed, 
  // but we want fixed columns MT P G M as per design.
  // We will collect values for these keys.

  orders.forEach((order) => {
    const storeKey = getStoreKey(order.store.name);

    order.items.forEach((item) => {
        // Only consider items with production quantity or relevant for production
        const qty = item.productionQuantity || 0;
        if (qty === 0 && item.type === "Vitrine") return; // Skip if 0? Or show 0? Usually skip if 0.
        // If it's "Encomenda", use quantity? The prompt says "PEDIDOS PRODUÇÃO".
        // Usually production orders use productionQuantity. 
        // But if item.type is Encomenda, maybe we should use item.quantity?
        // Let's use productionQuantity as primary, assuming the system populates it.
        // Fallback to quantity if productionQuantity is 0 and it's an order?
        // Based on previous context, productionQuantity is what's sent to production.
        
        const quantityToUse = item.productionQuantity || 0;
        
        if (quantityToUse > 0) {
            const category = getCategory(item.product.name);
            
            if (!data.has(category)) {
                data.set(category, new Map());
            }
            
            const productsMap = data.get(category)!;
            if (!productsMap.has(item.product.name)) {
                productsMap.set(item.product.name, new Map());
            }
            
            const storeMap = productsMap.get(item.product.name)!;
            const currentQty = storeMap.get(storeKey) || 0;
            storeMap.set(storeKey, currentQty + quantityToUse);
        }
    });
  });

  const definedCategories = ["DOCES", "SALGADOS", "VEGANOS", "SEM GLÚTEN", "OUTROS"];
  const storeColumns = ["MT", "P", "G", "M"];

  // Helper to sort products alphabetically
  const getSortedProducts = (category: string) => {
    const productsMap = data.get(category);
    if (!productsMap) return [];
    return Array.from(productsMap.keys()).sort();
  };

  const currentDate = dateFilter 
    ? new Date(dateFilter).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  return (
    <div className="p-8 bg-[#ffffff] min-h-screen text-[#000000] font-sans">
      <div className="flex justify-between items-center mb-6 border-b-2 border-[#000000] pb-2">
        <h1 className="text-3xl font-bold uppercase">PEDIDOS PRODUÇÃO</h1>
        <div className="text-xl font-bold">
          DATA: <span className="underline ml-2">{currentDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {["DOCES"].map((cat) => {
             const products = getSortedProducts(cat);
             if (products.length === 0) return null;
             
             return (
                <div key={cat} className="border-2 border-[#000000]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr 
                        className="bg-[#fde047] border-b-2 border-[#000000]"
                        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
                      >
                        <th className="text-left p-1 pl-2 border-r-2 border-[#000000] font-bold text-sm">{cat}</th>
                        {storeColumns.map(store => (
                            <th key={store} className="w-8 text-center border-r-2 border-[#000000] last:border-r-0 font-bold text-sm">{store}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                        {products.map((prod, idx) => {
                            const storeMap = data.get(cat)!.get(prod)!;
                            return (
                                <tr key={prod} className={cn("border-b border-[#9ca3af]", idx % 2 === 1 ? "bg-[#f9fafb]" : "")}>
                                    <td className="p-1 pl-2 border-r-2 border-[#000000] text-xs font-medium truncate max-w-[200px]">{prod}</td>
                                    {storeColumns.map(store => (
                                        <td key={store} className="text-center border-r-2 border-[#000000] last:border-r-0 text-xs font-bold">
                                            {storeMap.get(store) || ""}
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                    </tbody>
                  </table>
                </div>
             );
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
           {["SALGADOS", "VEGANOS", "SEM GLÚTEN", "OUTROS"].map((cat) => {
             const products = getSortedProducts(cat);
             if (products.length === 0) return null;
             
             return (
                <div key={cat} className="border-2 border-[#000000]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr 
                        className="bg-[#fde047] border-b-2 border-[#000000]"
                        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
                      >
                        <th className="text-left p-1 pl-2 border-r-2 border-[#000000] font-bold text-sm">{cat}</th>
                         {storeColumns.map(store => (
                            <th key={store} className="w-8 text-center border-r-2 border-[#000000] last:border-r-0 font-bold text-sm">{store}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                        {products.map((prod, idx) => {
                            const storeMap = data.get(cat)!.get(prod)!;
                            return (
                                <tr key={prod} className={cn("border-b border-[#9ca3af]", idx % 2 === 1 ? "bg-[#f9fafb]" : "")}>
                                    <td className="p-1 pl-2 border-r-2 border-[#000000] text-xs font-medium truncate max-w-[200px]">{prod}</td>
                                    {storeColumns.map(store => (
                                        <td key={store} className="text-center border-r-2 border-[#000000] last:border-r-0 text-xs font-bold">
                                            {storeMap.get(store) || ""}
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                    </tbody>
                  </table>
                </div>
             );
          })}

          {/* Placeholder sections for ESTOQUE, ENCOMENDAS, INSUMOS if needed per image */}
          <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-[#000000]">
                  <div 
                    className="bg-[#fde047] border-b-2 border-[#000000] p-1 text-center font-bold text-sm"
                    style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
                  >ESTOQUE</div>
                  <div className="p-2 h-20"></div>
              </div>
              <div className="border-2 border-[#000000]">
                  <div 
                    className="bg-[#fde047] border-b-2 border-[#000000] p-1 text-center font-bold text-sm"
                    style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
                  >QUANTIDADE</div>
                  <div className="p-2 h-20"></div>
              </div>
          </div>

          <div className="border-2 border-[#000000]">
             <div 
                className="grid grid-cols-2 bg-[#fde047] border-b-2 border-[#000000] text-center font-bold text-sm"
                style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
             >
                 <div className="border-r-2 border-[#000000] p-1">ENCOMENDAS</div>
                 <div className="p-1">LOJA</div>
             </div>
             <div className="h-24"></div>
          </div>

           <div className="border-2 border-[#000000]">
             <div 
                className="grid grid-cols-2 bg-[#fde047] border-b-2 border-[#000000] text-center font-bold text-sm"
                style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
             >
                 <div className="border-r-2 border-[#000000] p-1">INSUMOS EXTRAS</div>
                 <div className="p-1">LOJA</div>
             </div>
             <div className="h-16"></div>
          </div>

        </div>
      </div>
    </div>
  );
}

