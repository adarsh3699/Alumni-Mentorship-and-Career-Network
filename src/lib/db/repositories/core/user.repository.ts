/**
 * User Repository (Core)
 */

import type { Types } from 'mongoose';
import type { IUser } from '../../types';
import type { UserRole } from '../../types/enums';
import { User } from '../../models';
import { BaseRepository } from '../base.repository';

class UserRepositoryClass extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  /**
   * Find a user by their external SSO identity within a tenant.
   */
  async findByExternalId(
    institutionId: Types.ObjectId,
    externalIdentityId: string
  ): Promise<IUser | null> {
    return this.findOne(institutionId, { externalIdentityId });
  }

  /**
   * Find all users by role within a tenant.
   */
  async findByRole(
    institutionId: Types.ObjectId,
    role: UserRole
  ): Promise<IUser[]> {
    return this.findMany(institutionId, { role });
  }

  /**
   * Create or retrieve a user based on SSO claims (upsert pattern).
   */
  async findOrCreate(
    institutionId: Types.ObjectId,
    externalIdentityId: string,
    role: UserRole
  ): Promise<{ user: IUser; created: boolean }> {
    const existing = await this.findByExternalId(institutionId, externalIdentityId);
    if (existing) {
      return { user: existing, created: false };
    }

    const user = await this.create({
      institutionId,
      externalIdentityId,
      role,
      status: 'active',
    } as Partial<IUser>);

    return { user, created: true };
  }
}

/** Singleton instance */
export const UserRepository = new UserRepositoryClass();
