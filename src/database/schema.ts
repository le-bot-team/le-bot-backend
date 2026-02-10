import {
  pgTable,
  index,
  foreignKey,
  unique,
  check,
  uuid,
  timestamp,
  text,
  jsonb,
  integer,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const deviceSharePermissionType = pgEnum('device_share_permission_type', ['view', 'control'])
export const deviceType = pgEnum('device_type', ['robot'])
export const groupRoleType = pgEnum('group_role_type', ['owner', 'admin', 'member'])
export const messageType = pgEnum('message_type', [
  'question',
  'answer',
  'function_call',
  'tool_output',
  'tool_response',
  'follow_up',
  'verbose',
])
export const personRelationshipType = pgEnum('person_relationship_type', [
  'self',
  'family',
  'friend',
  'colleague',
  'other',
])

export const devices = pgTable(
  'devices',
  {
    id: uuid()
      .default(sql`uuidv7()`)
      .primaryKey()
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    identifier: text().notNull(),
    ownerId: uuid('owner_id').notNull(),
    type: deviceType().notNull(),
    model: text().notNull(),
    name: text(),
    status: jsonb(),
    config: jsonb(),
  },
  (table) => [
    index('idx_devices_owner').using('btree', table.ownerId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: 'devices_owner_id_fkey',
    }).onDelete('cascade'),
    unique('devices_identifier_key').on(table.identifier),
    check('devices_id_not_null', sql`NOT NULL id`),
    check('devices_identifier_not_null', sql`NOT NULL identifier`),
    check('devices_owner_id_not_null', sql`NOT NULL owner_id`),
    check('devices_type_not_null', sql`NOT NULL type`),
    check('devices_model_not_null', sql`NOT NULL model`),
  ],
)

export const users = pgTable(
  'users',
  {
    id: uuid()
      .default(sql`uuidv7()`)
      .primaryKey()
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    username: text(),
    passwordHash: text('password_hash'),
    email: text(),
    phone: text(),
  },
  (table) => [
    index('idx_users_email').using('btree', table.email.asc().nullsLast().op('text_ops')),
    index('idx_users_phone').using('btree', table.phone.asc().nullsLast().op('text_ops')),
    unique('users_username_key').on(table.username),
    unique('users_email_key').on(table.email),
    unique('users_phone_key').on(table.phone),
    check('check_email_or_phone', sql`(email IS NOT NULL) OR (phone IS NOT NULL)`),
    check('users_id_not_null', sql`NOT NULL id`),
  ],
)

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid().primaryKey().notNull(),
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
    check('user_profiles_id_not_null', sql`NOT NULL id`),
  ],
)

export const persons = pgTable(
  'persons',
  {
    id: uuid().primaryKey().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    userId: uuid('user_id').notNull(),
    name: text(),
    age: integer(),
    address: text(),
    relationship: personRelationshipType().default('other'),
    metadata: jsonb(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'persons_user_id_fkey',
    }).onDelete('cascade'),
    check('persons_id_not_null', sql`NOT NULL id`),
    check('persons_user_id_not_null', sql`NOT NULL user_id`),
  ],
)

export const groups = pgTable(
  'groups',
  {
    id: uuid()
      .default(sql`uuidv7()`)
      .primaryKey()
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    name: text().notNull(),
    description: text(),
  },
  (table) => [
    unique('groups_name_key').on(table.name),
    check('groups_id_not_null', sql`NOT NULL id`),
    check('groups_name_not_null', sql`NOT NULL name`),
  ],
)

export const conversations = pgTable(
  'conversations',
  {
    id: text().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    personId: uuid('person_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    messages: jsonb().default([]),
    metaData: jsonb('meta_data'),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'conversations_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.personId],
      foreignColumns: [persons.id],
      name: 'conversations_person_id_fkey',
    }).onDelete('cascade'),
    check('conversations_id_not_null', sql`NOT NULL id`),
    check('conversations_user_id_not_null', sql`NOT NULL user_id`),
    check('conversations_person_id_not_null', sql`NOT NULL person_id`),
  ],
)

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: uuid('group_id').notNull(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    role: groupRoleType().default('member'),
  },
  (table) => [
    index('idx_group_members_user').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
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
      columns: [table.userId, table.groupId],
      name: 'group_members_pkey',
    }),
    check('group_members_group_id_not_null', sql`NOT NULL group_id`),
    check('group_members_user_id_not_null', sql`NOT NULL user_id`),
  ],
)

export const deviceGroupData = pgTable(
  'device_group_data',
  {
    deviceId: uuid('device_id').notNull(),
    groupId: uuid('group_id').notNull(),
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
      columns: [table.groupId, table.deviceId],
      name: 'device_group_data_pkey',
    }),
    check('device_group_data_device_id_not_null', sql`NOT NULL device_id`),
    check('device_group_data_group_id_not_null', sql`NOT NULL group_id`),
  ],
)

export const deviceUserData = pgTable(
  'device_user_data',
  {
    deviceId: uuid('device_id').notNull(),
    userId: uuid('user_id').notNull(),
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
      columns: [table.userId, table.deviceId],
      name: 'device_user_data_pkey',
    }),
    check('device_user_data_device_id_not_null', sql`NOT NULL device_id`),
    check('device_user_data_user_id_not_null', sql`NOT NULL user_id`),
  ],
)

export const deviceShares = pgTable(
  'device_shares',
  {
    deviceId: uuid('device_id').notNull(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    permission: deviceSharePermissionType().default('view'),
  },
  (table) => [
    index('idx_device_shares_user').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
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
      columns: [table.userId, table.deviceId],
      name: 'device_shares_pkey',
    }),
    check('device_shares_device_id_not_null', sql`NOT NULL device_id`),
    check('device_shares_user_id_not_null', sql`NOT NULL user_id`),
  ],
)
