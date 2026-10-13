/**
 * Profile Synthesis Module
 *
 * Solves the Asymmetric Profile Gap by projecting student aspirations
 * and alumni career achievements into structured semantic pseudo-documents.
 */

import type { IAlumnus, IStudentProfile, ICareerGoal } from '../../db/types';

/**
 * Synthesize a structured semantic document from a student profile and career goals.
 */
export function synthesizeStudentDocument(
  profile: IStudentProfile,
  goals: ICareerGoal[]
): string {
  const targetIndustries = (profile.targetIndustries ?? []).join(', ');
  const interests = (profile.interests ?? []).join(', ');
  const targetRoles = (profile.targetRoles ?? []).join(', ');
  const goalTitles = goals.map((g) => g.title).join('. ');

  return `
[STUDENT PROFILE]
Major: ${profile.major ?? 'Computer Science and Engineering'}
Degree: ${profile.degree ?? 'B.Tech'}
Expected Graduation: ${profile.graduationYear ?? 'Upcoming'}
Target Roles: ${targetRoles || 'Software Engineer, Systems Engineer'}
Target Industries: ${targetIndustries || 'Technology, Software Engineering'}
Technical Interests & Skills: ${interests}
Career Goals: ${goalTitles || 'Secure Software Engineering placement and build scalable systems'}
`.trim();
}

/**
 * Synthesize a structured semantic document from an alumnus profile.
 */
export function synthesizeAlumnusDocument(alumnus: IAlumnus): string {
  const expertise = (alumnus.expertise ?? alumnus.mentoringInterests ?? []).join(', ');
  const currentTitle = alumnus.currentTitle ?? alumnus.currentRole ?? alumnus.professionalHeadline ?? 'Engineer';
  const currentCompany = alumnus.currentCompany ?? 'Technology Enterprise';
  const industry = alumnus.industry ?? 'Technology';
  const bio = alumnus.bio ?? alumnus.professionalHeadline ?? '';

  return `
[ALUMNUS PROFILE]
Current Role: ${currentTitle}
Current Company: ${currentCompany}
Industry: ${industry}
Core Expertise & Technologies: ${expertise}
Education: ${alumnus.degree ?? 'B.Tech'} in ${alumnus.major ?? 'Computer Science and Engineering'}, Class of ${alumnus.graduationYear ?? 'Alumnus'}
Professional Background: ${bio}
`.trim();
}
