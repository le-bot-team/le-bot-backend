import { relations } from "drizzle-orm/relations";
import { users, userProfiles, devices, conversations, conversationChats, groups, groupMembers, deviceGroupData, deviceUserData, deviceShares } from "./schema";

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(users, {
		fields: [userProfiles.id],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userProfiles: many(userProfiles),
	devices: many(devices),
	conversations: many(conversations),
	conversationChats: many(conversationChats),
	groupMembers: many(groupMembers),
	deviceUserData: many(deviceUserData),
	deviceShares: many(deviceShares),
}));

export const devicesRelations = relations(devices, ({one, many}) => ({
	user: one(users, {
		fields: [devices.ownerId],
		references: [users.id]
	}),
	deviceGroupData: many(deviceGroupData),
	deviceUserData: many(deviceUserData),
	deviceShares: many(deviceShares),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	user: one(users, {
		fields: [conversations.userId],
		references: [users.id]
	}),
	conversationChats: many(conversationChats),
}));

export const conversationChatsRelations = relations(conversationChats, ({one}) => ({
	user: one(users, {
		fields: [conversationChats.userId],
		references: [users.id]
	}),
	conversation: one(conversations, {
		fields: [conversationChats.conversationId],
		references: [conversations.id]
	}),
}));

export const groupMembersRelations = relations(groupMembers, ({one}) => ({
	group: one(groups, {
		fields: [groupMembers.groupId],
		references: [groups.id]
	}),
	user: one(users, {
		fields: [groupMembers.userId],
		references: [users.id]
	}),
}));

export const groupsRelations = relations(groups, ({many}) => ({
	groupMembers: many(groupMembers),
	deviceGroupData: many(deviceGroupData),
}));

export const deviceGroupDataRelations = relations(deviceGroupData, ({one}) => ({
	device: one(devices, {
		fields: [deviceGroupData.deviceId],
		references: [devices.id]
	}),
	group: one(groups, {
		fields: [deviceGroupData.groupId],
		references: [groups.id]
	}),
}));

export const deviceUserDataRelations = relations(deviceUserData, ({one}) => ({
	device: one(devices, {
		fields: [deviceUserData.deviceId],
		references: [devices.id]
	}),
	user: one(users, {
		fields: [deviceUserData.userId],
		references: [users.id]
	}),
}));

export const deviceSharesRelations = relations(deviceShares, ({one}) => ({
	device: one(devices, {
		fields: [deviceShares.deviceId],
		references: [devices.id]
	}),
	user: one(users, {
		fields: [deviceShares.userId],
		references: [users.id]
	}),
}));