import { relations } from 'drizzle-orm/relations'
import {
  users,
  devices,
  userProfiles,
  persons,
  conversations,
  groups,
  groupMembers,
  deviceGroupData,
  deviceUserData,
  deviceShares,
} from './schema'

export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, {
    fields: [devices.ownerId],
    references: [users.id],
  }),
  deviceGroupData: many(deviceGroupData),
  deviceUserData: many(deviceUserData),
  deviceShares: many(deviceShares),
}))

export const usersRelations = relations(users, ({ many }) => ({
  devices: many(devices),
  userProfiles: many(userProfiles),
  persons: many(persons),
  conversations: many(conversations),
  groupMembers: many(groupMembers),
  deviceUserData: many(deviceUserData),
  deviceShares: many(deviceShares),
}))

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.id],
    references: [users.id],
  }),
}))

export const personsRelations = relations(persons, ({ one, many }) => ({
  user: one(users, {
    fields: [persons.userId],
    references: [users.id],
  }),
  conversations: many(conversations),
}))

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  person: one(persons, {
    fields: [conversations.personId],
    references: [persons.id],
  }),
}))

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}))

export const groupsRelations = relations(groups, ({ many }) => ({
  groupMembers: many(groupMembers),
  deviceGroupData: many(deviceGroupData),
}))

export const deviceGroupDataRelations = relations(deviceGroupData, ({ one }) => ({
  device: one(devices, {
    fields: [deviceGroupData.deviceId],
    references: [devices.id],
  }),
  group: one(groups, {
    fields: [deviceGroupData.groupId],
    references: [groups.id],
  }),
}))

export const deviceUserDataRelations = relations(deviceUserData, ({ one }) => ({
  device: one(devices, {
    fields: [deviceUserData.deviceId],
    references: [devices.id],
  }),
  user: one(users, {
    fields: [deviceUserData.userId],
    references: [users.id],
  }),
}))

export const deviceSharesRelations = relations(deviceShares, ({ one }) => ({
  device: one(devices, {
    fields: [deviceShares.deviceId],
    references: [devices.id],
  }),
  user: one(users, {
    fields: [deviceShares.userId],
    references: [users.id],
  }),
}))
