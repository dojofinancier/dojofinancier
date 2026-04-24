-- Add ai_model column to accompagnement_products table
-- Allows admin to configure which OpenAI model is used per product
ALTER TABLE "accompagnement_products"
ADD COLUMN IF NOT EXISTS "ai_model" TEXT NOT NULL DEFAULT 'gpt-5.4-mini';
