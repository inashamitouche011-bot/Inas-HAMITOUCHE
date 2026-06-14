import { pgTable, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";

// Users table mapping to 'inasuivi_users'
export const inasuiviUsers = pgTable("inasuivi_users", {
  id: text("id").primaryKey(), // Firebase Auth UID
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  company: text("company"),
  role: text("role").default("supervisor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Projects table mapping to 'inasuivi_projects'
export const inasuiviProjects = pgTable("inasuivi_projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => inasuiviUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  clientName: text("client_name"),
  contractor: text("contractor"),
  supervisor: text("supervisor"),
  location: text("location"),
  tvaRate: numeric("tva_rate").default("20"),
  retentionRate: numeric("retention_rate").default("5"),
  contractDate: text("contract_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  extraData: jsonb("extra_data").default({}).notNull(),
});

// Revision / Situation archives mapping to 'historique_situations'
export const historiqueSituations = pgTable("historique_situations", {
  id: text("id").primaryKey(), // We can use UUID or standard strings
  projetId: text("projet_id").notNull(),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// PV of meetings mapping to 'pv_reunions'
export const pvReunions = pgTable("pv_reunions", {
  id: text("id").primaryKey(),
  projetId: text("projet_id").notNull(),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
