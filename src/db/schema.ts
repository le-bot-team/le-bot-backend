import {
  pgTable,
  index,
  unique,
  check,
  bigserial,
  timestamp,
  text,
  foreignKey,
  bigint,
  jsonb,
  boolean,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const deviceSharePermissionType = pgEnum(
  'device_share_permission_type',
  ['view', 'control'],
)
export const deviceType = pgEnum('device_type', ['robot'])
export const groupRoleType = pgEnum('group_role_type', [
  'owner',
  'admin',
  'member',
])
export const messageType = pgEnum('message_type', [
  'question',
  'answer',
  'function_call',
  'tool_output',
  'tool_response',
  'follow_up',
  'verbose',
])

export const users = pgTable(
  'users',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    username: text(),
    passwordHash: text('password_hash'),
    email: text(),
    phone: text(),
  },
  (table) => [
    index('idx_users_email').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops'),
    ),
    index('idx_users_phone').using(
      'btree',
      table.phone.asc().nullsLast().op('text_ops'),
    ),
    unique('users_username_key').on(table.username),
    unique('users_email_key').on(table.email),
    unique('users_phone_key').on(table.phone),
    check(
      'check_email_or_phone',
      sql`(email IS NOT NULL) OR (phone IS NOT NULL)`,
    ),
  ],
)

export const userProfiles = pgTable(
  'user_profiles',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    nickname: text(),
    bio: text(),
    avatar: text(),
    avatarHash: text('avatar_hash'),
    region: text(),
    lastActive: timestamp('last_active', { mode: 'string' }),
    lastLogin: timestamp('last_login', { mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [users.id],
      name: 'user_profiles_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const groups = pgTable(
  'groups',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    name: text().notNull(),
    description: text(),
  },
  (table) => [unique('groups_name_key').on(table.name)],
)

export const devices = pgTable(
  'devices',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    identifier: text().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    ownerId: bigint('owner_id', { mode: 'number' }).notNull(),
    type: deviceType().notNull(),
    model: text().notNull(),
    name: text(),
    status: jsonb(),
    config: jsonb(),
  },
  (table) => [
    index('idx_devices_owner').using(
      'btree',
      table.ownerId.asc().nullsLast().op('int8_ops'),
    ),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: 'devices_owner_id_fkey',
    }).onDelete('cascade'),
    unique('devices_identifier_key').on(table.identifier),
  ],
)

export const conversations = pgTable(
  'conversations',
  {
    id: text().primaryKey().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    botId: text('bot_id'),
    metaData: jsonb('meta_data'),
    messages: jsonb(),
    lastSectionId: text('last_section_id'),
    logId: text('log_id'),
  },
  (table) => [
    index('idx_conversations_user').using(
      'btree',
      table.userId.asc().nullsLast().op('int8_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'conversations_user_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const conversationChats = pgTable(
  'conversation_chats',
  {
    id: text().primaryKey().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    conversationId: text('conversation_id').notNull(),
    sectionId: text('section_id').notNull(),
    botId: text('bot_id').notNull(),
    shortcutCommandId: text('shortcut_command_id').notNull(),
    additionalMessages: jsonb('additional_messages'),
    stream: boolean(),
    customVariables: jsonb('custom_variables'),
    autoSaveHistory: boolean('auto_save_history'),
    metaData: jsonb('meta_data'),
    extraParams: jsonb('extra_params'),
    response: jsonb(),
    type: messageType(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'conversation_chats_user_id_fkey',
    }),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.id],
      name: 'conversation_chats_conversation_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const groupMembers = pgTable(
  'group_members',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    groupId: bigint('group_id', { mode: 'number' }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    role: groupRoleType().default('member'),
  },
  (table) => [
    index('idx_group_members_user').using(
      'btree',
      table.userId.asc().nullsLast().op('int8_ops'),
    ),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'group_members_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'group_members_user_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.groupId, table.userId],
      name: 'group_members_pkey',
    }),
  ],
)

export const deviceGroupData = pgTable(
  'device_group_data',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    deviceId: bigint('device_id', { mode: 'number' }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    groupId: bigint('group_id', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    data: jsonb(),
  },
  (table) => [
    foreignKey({
      columns: [table.deviceId],
      foreignColumns: [devices.id],
      name: 'device_group_data_device_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'device_group_data_group_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.deviceId, table.groupId],
      name: 'device_group_data_pkey',
    }),
  ],
)

export const deviceUserData = pgTable(
  'device_user_data',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    deviceId: bigint('device_id', { mode: 'number' }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    data: jsonb(),
  },
  (table) => [
    foreignKey({
      columns: [table.deviceId],
      foreignColumns: [devices.id],
      name: 'device_user_data_device_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'device_user_data_user_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.deviceId, table.userId],
      name: 'device_user_data_pkey',
    }),
  ],
)

export const deviceShares = pgTable(
  'device_shares',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    deviceId: bigint('device_id', { mode: 'number' }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    permission: deviceSharePermissionType().default('view'),
  },
  (table) => [
    index('idx_device_shares_user').using(
      'btree',
      table.userId.asc().nullsLast().op('int8_ops'),
    ),
    foreignKey({
      columns: [table.deviceId],
      foreignColumns: [devices.id],
      name: 'device_shares_device_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'device_shares_user_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.deviceId, table.userId],
      name: 'device_shares_pkey',
    }),
  ],
)
