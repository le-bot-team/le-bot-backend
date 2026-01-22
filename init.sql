-- users tables
create table users
(
    id            uuid primary key default uuidv7(),
    created_at    timestamp        default now(),
    updated_at    timestamp        default now(),

    username      text unique,
    password_hash text,
    email         text unique,
    phone         text unique,

    constraint check_email_or_phone check (email is not null or phone is not null)
);
create index idx_users_email on users (email);
create index idx_users_phone on users (phone);

create table user_profiles
(
    id          uuid not null unique primary key references users (id) on delete cascade,
    created_at  timestamp default now(),
    updated_at  timestamp default now(),

    nickname    text,
    bio         text,
    avatar      text,
    avatar_hash text,
    region      text,

    last_active timestamp,
    last_login  timestamp
);

create table persons
(
    id          uuid not null unique primary key,
    created_at  timestamp default now(),
    updated_at  timestamp default now(),

    user_id     uuid not null references users (id) on delete cascade,

    name        text,
    age         int,
    address     text,
    relationship text,  -- e.g., friend, family, colleague
    metadata    jsonb   -- Profile, hobbies, personalities, etc.
);

-- groups tables
create table groups
(
    id          uuid        not null primary key default uuidv7(),
    created_at  timestamp                        default now(),
    updated_at  timestamp                        default now(),

    name        text unique not null,
    description text
);

create type group_role_type as enum ('owner', 'admin', 'member');
create table group_members
(
    group_id   uuid not null references groups (id) on delete cascade,
    user_id    uuid not null references users (id) on delete cascade,
    created_at timestamp       default now(),
    updated_at timestamp       default now(),

    role       group_role_type default 'member',

    unique (group_id, user_id),
    primary key (group_id, user_id)
);
create index idx_group_members_user on group_members (user_id);

-- devices tables
create type device_type as enum ('robot');
create type device_share_permission_type as enum ('view', 'control');
create table devices
(
    id         uuid primary key default uuidv7(),
    created_at timestamp        default now(),
    updated_at timestamp        default now(),

    identifier text        not null unique,
    owner_id   uuid        not null references users (id) on delete cascade,
    type       device_type not null,
    model      text        not null,
    name       text,
    status     jsonb,
    config     jsonb
);
create table device_group_data
(
    device_id  uuid not null references devices (id) on delete cascade,
    group_id   uuid not null references groups (id) on delete cascade,
    created_at timestamp default now(),
    updated_at timestamp default now(),

    data       jsonb,

    unique (device_id, group_id),
    primary key (device_id, group_id)
);
create table device_user_data
(
    device_id  uuid not null references devices (id) on delete cascade,
    user_id    uuid not null references users (id) on delete cascade,
    created_at timestamp default now(),
    updated_at timestamp default now(),

    data       jsonb,
    unique (device_id, user_id),
    primary key (device_id, user_id)
);
create table device_shares
(
    device_id  uuid not null references devices (id) on delete cascade,
    user_id    uuid not null references users (id) on delete cascade,
    created_at timestamp                    default now(),
    updated_at timestamp                    default now(),

    permission device_share_permission_type default 'view',

    unique (device_id, user_id),
    primary key (device_id, user_id)
);
create index idx_devices_owner on devices (owner_id);
create index idx_device_shares_user on device_shares (user_id);

-- conversation tables
create type message_type as enum ('question', 'answer', 'function_call', 'tool_output', 'tool_response', 'follow_up', 'verbose');
create table conversations
(
    id         text not null unique primary key,
    user_id    uuid not null references users (id) on delete cascade,
    person_id  uuid not null references persons (id) on delete cascade,
    created_at timestamp default now(),
    updated_at timestamp default now(),

    messages   jsonb     default '[]'::jsonb,
    meta_data  jsonb
);
