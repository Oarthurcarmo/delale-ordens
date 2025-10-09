import {
  pgTable,
  text,
  varchar,
  timestamp,
  pgEnum,
  integer,
  boolean,
  date,
  uuid,
  serial,
} from "drizzle-orm/pg-core";

export const roles = pgEnum("roles", ["manager", "supervisor", "owner"]);
export const orderItemType = pgEnum("order_item_type", [
  "Vitrine",
  "Encomenda",
]);
export const requestStatus = pgEnum("request_status", [
  "pending",
  "approved",
  "rejected",
]);
export const orderStatus = pgEnum("order_status", [
  "pending",
  "in_production",
  "completed",
  "cancelled",
]);

export const productionStatus = pgEnum("production_status", [
  "awaiting_start", // Aguardando início
  "in_preparation", // Em preparação
  "in_oven", // No forno
  "cooling", // Esfriando
  "packaging", // Embalando
  "ready_for_pickup", // Pronto para retirada
  "completed", // Concluído
]);

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  username: varchar("username", { length: 256 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roles("role").notNull(),
  storeId: integer("store_id").references(() => stores.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  isClassA: boolean("is_class_a").default(false).notNull(),
});

export const salesHistory = pgTable("sales_history", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  year: integer("year").notNull(),
  month: varchar("month", { length: 3 }).notNull(),
  total: integer("total").notNull(),
});

export const dailyInsight = pgTable("daily_insight", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  insight: text("insight").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  storeId: integer("store_id")
    .notNull()
    .references(() => stores.id),
  managerId: integer("manager_id")
    .notNull()
    .references(() => users.id),
  status: orderStatus("status").default("pending").notNull(),
  productionStatus:
    productionStatus("production_status").default("awaiting_start"),
  productionUpdatedBy: integer("production_updated_by").references(
    () => users.id
  ),
  productionUpdatedAt: timestamp("production_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  stock: integer("stock").notNull(),
  quantity: integer("quantity").notNull(),
  type: orderItemType("type").notNull(),
  clientName: varchar("client_name", { length: 256 }),
  deliveryDate: date("delivery_date"),
});

export const editRequests = pgTable("edit_requests", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  requesterId: integer("requester_id")
    .notNull()
    .references(() => users.id),
  description: text("description").notNull(),
  status: requestStatus("status").default("pending").notNull(),
  decidedBy: integer("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at"),
});

export const orderItemEditRequests = pgTable("order_item_edit_requests", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id")
    .notNull()
    .references(() => orderItems.id),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  requesterId: integer("requester_id")
    .notNull()
    .references(() => users.id),
  // Campos originais (antes da edição)
  originalStock: integer("original_stock").notNull(),
  originalQuantity: integer("original_quantity").notNull(),
  originalType: orderItemType("original_type").notNull(),
  originalClientName: varchar("original_client_name", { length: 256 }),
  originalDeliveryDate: date("original_delivery_date"),
  // Novos valores solicitados
  newStock: integer("new_stock"),
  newQuantity: integer("new_quantity"),
  newType: orderItemType("new_type"),
  newClientName: varchar("new_client_name", { length: 256 }),
  newDeliveryDate: date("new_delivery_date"),
  // Status e decisão
  status: requestStatus("status").default("pending").notNull(),
  decidedBy: integer("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ one, many }) => ({
  store: one(stores, {
    fields: [users.storeId],
    references: [stores.id],
  }),
  orders: many(orders),
  editRequests: many(editRequests),
}));

export const storesRelations = relations(stores, ({ many }) => ({
  users: many(users),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
  salesHistory: many(salesHistory),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  manager: one(users, {
    fields: [orders.managerId],
    references: [users.id],
  }),
  productionUpdater: one(users, {
    fields: [orders.productionUpdatedBy],
    references: [users.id],
  }),
  items: many(orderItems),
  editRequests: many(editRequests),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  editRequests: many(orderItemEditRequests),
}));

export const editRequestsRelations = relations(editRequests, ({ one }) => ({
  order: one(orders, {
    fields: [editRequests.orderId],
    references: [orders.id],
  }),
  requester: one(users, {
    fields: [editRequests.requesterId],
    references: [users.id],
  }),
  decider: one(users, {
    fields: [editRequests.decidedBy],
    references: [users.id],
  }),
}));

export const orderItemEditRequestsRelations = relations(
  orderItemEditRequests,
  ({ one }) => ({
    orderItem: one(orderItems, {
      fields: [orderItemEditRequests.orderItemId],
      references: [orderItems.id],
    }),
    order: one(orders, {
      fields: [orderItemEditRequests.orderId],
      references: [orders.id],
    }),
    requester: one(users, {
      fields: [orderItemEditRequests.requesterId],
      references: [users.id],
    }),
    decider: one(users, {
      fields: [orderItemEditRequests.decidedBy],
      references: [users.id],
    }),
  })
);

export const salesHistoryRelations = relations(salesHistory, ({ one }) => ({
  product: one(products, {
    fields: [salesHistory.productId],
    references: [products.id],
  }),
}));
