-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."device_share_permission_type" AS ENUM('view', 'control');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('robot');--> statement-breakpoint
CREATE TYPE "public"."group_role_type" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('question', 'answer', 'function_call', 'tool_output', 'tool_response', 'follow_up', 'verbose');--> statement-breakpoint
CREATE TABLE "conversation_chats" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"user_id" bigint NOT NULL,
	"conversation_id" text NOT NULL,
	"section_id" text NOT NULL,
	"bot_id" text NOT NULL,
	"shortcut_command_id" text NOT NULL,
	"additional_messages" jsonb,
	"stream" boolean,
	"custom_variables" jsonb,
	"auto_save_history" boolean,
	"meta_data" jsonb,
	"extra_params" jsonb,
	"response" jsonb,
	"type" "message_type"
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	CONSTRAINT "users_username_key" UNIQUE("username"),
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_phone_key" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" bigint PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"nickname" text NOT NULL,
	"bio" text,
	"avatar" text,
	"avatar_hash" text,
	"region" text NOT NULL,
	"last_active" timestamp,
	"last_login" timestamp
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "groups_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"identifier" text NOT NULL,
	"owner_id" bigint NOT NULL,
	"type" "device_type" NOT NULL,
	"model" text NOT NULL,
	"name" text,
	"status" jsonb,
	"config" jsonb,
	CONSTRAINT "devices_identifier_key" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"user_id" bigint NOT NULL,
	"bot_id" text,
	"meta_data" jsonb,
	"messages" jsonb,
	"last_section_id" text,
	"log_id" text
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"role" "group_role_type" DEFAULT 'member',
	CONSTRAINT "group_members_pkey" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "device_group_data" (
	"device_id" bigint NOT NULL,
	"group_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"data" jsonb,
	CONSTRAINT "device_group_data_pkey" PRIMARY KEY("device_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "device_user_data" (
	"device_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"data" jsonb,
	CONSTRAINT "device_user_data_pkey" PRIMARY KEY("device_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "device_shares" (
	"device_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"permission" "device_share_permission_type" DEFAULT 'view',
	CONSTRAINT "device_shares_pkey" PRIMARY KEY("device_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "conversation_chats" ADD CONSTRAINT "conversation_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_chats" ADD CONSTRAINT "conversation_chats_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_group_data" ADD CONSTRAINT "device_group_data_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_group_data" ADD CONSTRAINT "device_group_data_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_user_data" ADD CONSTRAINT "device_user_data_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_user_data" ADD CONSTRAINT "device_user_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_shares" ADD CONSTRAINT "device_shares_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_shares" ADD CONSTRAINT "device_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_phone" ON "users" USING btree ("phone" text_ops);--> statement-breakpoint
CREATE INDEX "idx_devices_owner" ON "devices" USING btree ("owner_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_conversations_user" ON "conversations" USING btree ("user_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_group_members_user" ON "group_members" USING btree ("user_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_device_shares_user" ON "device_shares" USING btree ("user_id" int8_ops);
*/