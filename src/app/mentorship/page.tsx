import { AppShell } from "../_components/app-shell";
import MentorshipBoard from "../_components/mentorship-board";

export default function MentorshipPage() {
  return <AppShell active="mentorship" eyebrow="Active relationship" title="Aarav + Meera"><MentorshipBoard /></AppShell>;
}
