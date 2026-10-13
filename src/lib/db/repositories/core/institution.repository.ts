/**
 * Institution Repository (Core)
 */

import type { IInstitution } from '../../types';
import { Institution } from '../../models';
import { BaseRepository } from '../base.repository';

class InstitutionRepositoryClass extends BaseRepository<IInstitution> {
  constructor() {
    super(Institution);
  }

  /**
   * Find an institution by its unique code.
   */
  async findByCode(code: string): Promise<IInstitution | null> {
    return this.model.findOne({ code: code.toUpperCase() }).lean<IInstitution>().exec();
  }

  /**
   * Find all active institutions.
   */
  async findAllActive(): Promise<IInstitution[]> {
    return this.model.find({ status: 'active' }).lean<IInstitution[]>().exec();
  }
}

/** Singleton instance */
export const InstitutionRepository = new InstitutionRepositoryClass();
