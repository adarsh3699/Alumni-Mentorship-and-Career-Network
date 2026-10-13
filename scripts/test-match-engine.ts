/**
 * P11 Matchmaker Engine Verification Script
 *
 * Runs an end-to-end simulation of the 4-Stage Funnel Matchmaker
 * against the seeded Lovely Professional University (LPU) CSE dataset:
 *
 * - Stage 1: Capacity, Multi-Tenant & Anti-Herd Filtering
 * - Stage 2: Dense Semantic Vector + Taxonomy Overlap Retrieval
 * - Stage 3: Multi-Factor Domain Scoring (Gaussian Seniority, Bayesian Ratings)
 * - Stage 4: Non-Hallucinated Explainability & Diversity Reranking
 *
 * Usage: npx tsx scripts/test-match-engine.ts
 */

import { connectDB } from '../src/lib/db/connection';
import { Institution, User, StudentProfile } from '../src/lib/db/models';
import { matchEngine } from '../src/lib/match-engine';
import { UserRole } from '../src/lib/db/types/enums';

async function runMatchmakerTest() {
  console.log('🚀 Initializing Matchmaker Engine Test against LPU CSE Data...\n');
  await connectDB();

  // 1. Locate LPU Institution
  const institution = await Institution.findOne({ code: 'LPU' });
  if (!institution) {
    console.error('❌ Institution LPU not found. Please run `npm run db:seed` first.');
    process.exit(1);
  }

  console.log(`🏛️ Institution Context: ${institution.name} (Code: ${institution.code}, ID: ${institution._id})\n`);

  // 2. Fetch sample students
  const studentUsers = await User.find({
    institutionId: institution._id,
    role: UserRole.STUDENT,
  }).limit(3);

  if (studentUsers.length === 0) {
    console.error('❌ No student users found. Please run `npm run db:seed` first.');
    process.exit(1);
  }

  for (let sIdx = 0; sIdx < studentUsers.length; sIdx++) {
    const studentUser = studentUsers[sIdx];
    const studentProfile = await StudentProfile.findOne({
      institutionId: institution._id,
      userId: studentUser._id,
    });

    if (!studentProfile) continue;

    console.log('='.repeat(78));
    console.log(`🎓 Testing Student #${sIdx + 1} (SSO: ${studentUser.externalIdentityId})`);
    console.log(`   Major: ${studentProfile.major ?? 'CSE'} | Grad Year: ${studentProfile.graduationYear ?? 2026}`);
    console.log(`   Interests: ${(studentProfile.interests ?? []).join(', ')}`);
    console.log(`   Target Industries: ${(studentProfile.targetIndustries ?? []).join(', ')}`);
    console.log('-'.repeat(78));

    // Run the 4-stage matching engine
    const t0 = performance.now();
    const recommendations = await matchEngine.getRecommendationsForStudent(
      institution._id,
      studentUser._id,
      { limit: 4, persistScores: true }
    );
    const duration = (performance.now() - t0).toFixed(2);

    console.log(`⚡ Matchmaker executed in ${duration}ms | Found ${recommendations.length} top recommendations:\n`);

    for (const rec of recommendations) {
      const scorePct = (rec.totalScore * 100).toFixed(1);
      console.log(`   [Rank #${rec.rank}] ${rec.alumnusName} — ${rec.alumnusTitle} @ ${rec.alumnusCompany}`);
      console.log(`   Industry: ${rec.alumnusIndustry} | Grad: ${rec.alumnusGradYear} | Capacity Slots: ${rec.capacityRemaining}`);
      console.log(`   Total Composite Score: ${scorePct}%`);
      console.log(`   Component Breakdown:`);
      console.log(`     • Semantic Vector Similarity: ${(rec.breakdown.semanticScore * 100).toFixed(1)}%`);
      console.log(`     • Taxonomy Tag Overlap:       ${(rec.breakdown.taxonomyScore * 100).toFixed(1)}%`);
      console.log(`     • Seniority Sweet Spot:       ${(rec.breakdown.seniorityScore * 100).toFixed(1)}%`);
      console.log(`     • Bayesian Smoothed Rating:   ${(rec.breakdown.ratingScore * 100).toFixed(1)}%`);
      console.log(`     • Responsiveness & Velocity:  ${(rec.breakdown.responsivenessScore * 100).toFixed(1)}%`);
      console.log(`     • Availability Window:        ${(rec.breakdown.availabilityScore * 100).toFixed(1)}%`);
      console.log(`   Transparent Reasons (SRS FR-M4-07 & FR-M4-10):`);
      for (const reason of rec.reasons) {
        console.log(`     ✔ ${reason}`);
      }
      console.log('');
    }
  }

  console.log('='.repeat(78));
  console.log('✅ Matchmaker Engine verification completed successfully!');
  process.exit(0);
}

runMatchmakerTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
