import { AppShell } from "../_components/app-shell";
import MentorDiscovery from "../_components/mentor-discovery";

export default function MentorsPage() {
  return <AppShell active="mentors" eyebrow="Mentor discovery" title="Find your people"><MentorDiscovery /></AppShell>;
}
