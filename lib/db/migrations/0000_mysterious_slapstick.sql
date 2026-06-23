CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."acta_status" AS ENUM('draft', 'final');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('created', 'edited', 'downloaded', 'shared', 'deleted', 'status_changed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supabase_id" text,
	"email" text NOT NULL,
	"name" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_supabase_id_unique" UNIQUE("supabase_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"audio_url" text,
	"model_used" text,
	"status" "acta_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acta_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"acta_id" uuid NOT NULL,
	"url" text NOT NULL,
	"name" text,
	"position" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acta_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"acta_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'COP' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"plan" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actas" ADD CONSTRAINT "actas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actas" ADD CONSTRAINT "actas_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acta_images" ADD CONSTRAINT "acta_images_acta_id_actas_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acta_audit" ADD CONSTRAINT "acta_audit_acta_id_actas_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acta_audit" ADD CONSTRAINT "acta_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;