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

export const orderItemSchema = z.object({
  productId: z.number(),
  stock: z.number().min(0),
  quantity: z.number().min(1),
  type: z.enum(["Vitrine", "Encomenda"]),
  clientName: z.string().optional(),
  deliveryDate: z.string().optional(),
  observation: z.string().optional(),
});

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

export const orderItemEditRequestSchema = z.object({
  orderItemId: z.number(),
  newStock: z.number().min(0),
  newQuantity: z.number().min(0),
  newType: z.enum(["Vitrine", "Encomenda"]),
  newClientName: z.string().nullish(),
  newDeliveryDate: z.string().nullish(),
});

export const createOrderItemEditRequestsSchema = z.object({
  requests: z.array(orderItemEditRequestSchema).min(1),
});

export const batchOrderItemEditRequestSchema = z.object({
  requestIds: z.array(z.number()).min(1),
  decision: z.enum(["approved", "rejected"]),
});
