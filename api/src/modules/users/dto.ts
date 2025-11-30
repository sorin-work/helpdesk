import type { User } from '../../db/schema/index.js';

export interface UserDto {
  id: number;
  email: string;
  name: string;
  role: User['role'];
  active: boolean;
  createdAt: string;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
  };
}

/** What other people get to see about a user (e.g. a message author). */
export interface PersonDto {
  id: number;
  name: string;
  role: User['role'];
}

export function toPersonDto(user: Pick<User, 'id' | 'name' | 'role'>): PersonDto {
  return { id: user.id, name: user.name, role: user.role };
}
