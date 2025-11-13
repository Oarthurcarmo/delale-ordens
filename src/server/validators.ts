import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["manager", "supervisor", "owner"]),
  storeId: z.number().optional(),
});

export const loginSchema = z.union([
  z.object({ username: z.string().min(1), password: z.string().min(1) }),
  z.object({ email: z.string().email(), password: z.string().min(1) }),
]);

export const orderItemSchema = z
  .object({
    productId: z.number(),
    stock: z.number().min(0),
    quantity: z.number().min(0), // Encomendas
    productionQuantity: z.number().min(0).default(0), // Pedidos para Produção
    type: z.enum(["Vitrine", "Encomenda"]),
    clientName: z.string().optional(),
    deliveryDate: z.string().optional(),
    observation: z.string().optional(),
  })
  .refine(
    (data) => {
      // Se o tipo for "Encomenda" E quantity > 0, clientName e deliveryDate são obrigatórios
      if (data.type === "Encomenda" && data.quantity > 0) {
        return (
          data.clientName &&
          data.clientName.trim().length > 0 &&
          data.deliveryDate &&
          data.deliveryDate.trim().length > 0
        );
      }
      return true;
    },
    {
      message:
        "Para itens do tipo 'Encomenda', o nome do cliente e a data de entrega são obrigatórios",
      path: ["clientName"],
    }
  )
  .refine(
    (data) => {
      // Pelo menos um dos campos deve ser maior que 0
      return data.stock > 0 || data.quantity > 0 || data.productionQuantity > 0;
    },
    {
      message:
        "O item deve ter estoque, encomendas ou pedidos de produção maior que zero",
      path: ["productionQuantity"],
    }
  );

export const createOrderSchema = z.object({
  storeId: z.number(),
  items: z.array(orderItemSchema).min(1),
});

export const createEditRequestSchema = z.object({
  description: z.string().min(10),
});

export const updateEditRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const orderItemEditRequestSchema = z
  .object({
    orderItemId: z.number(),
    newStock: z.number().min(0),
    newQuantity: z.number().min(0),
    newType: z.enum(["Vitrine", "Encomenda"]),
    newClientName: z.string().nullish(),
    newDeliveryDate: z.string().nullish(),
  })
  .refine(
    (data) => {
      // Se o novo tipo for "Encomenda", newClientName e newDeliveryDate são obrigatórios
      if (data.newType === "Encomenda") {
        return (
          data.newClientName &&
          data.newClientName.trim().length > 0 &&
          data.newDeliveryDate &&
          data.newDeliveryDate.trim().length > 0
        );
      }
      return true;
    },
    {
      message:
        "Para itens do tipo 'Encomenda', o nome do cliente e a data de entrega são obrigatórios",
      path: ["newClientName"],
    }
  );

export const createOrderItemEditRequestsSchema = z.object({
  requests: z.array(orderItemEditRequestSchema).min(1),
});

export const batchOrderItemEditRequestSchema = z.object({
  requestIds: z.array(z.number()).min(1),
  decision: z.enum(["approved", "rejected"]),
});
