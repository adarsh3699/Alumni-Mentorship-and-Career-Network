import Link from "next/link";
import { AppShell, Avatar, SectionHeading, StatusBadge } from "../_components/app-shell";
import { Icon } from "../_components/icons";

export default function DashboardPage() {
  return <AppShell active="dashboard" eyebrow="Tuesday, 24 September 2026" title="Good morning, Aarav">
    <div className="page-intro dashboard-intro"><div><span className="section-eyebrow">Your mentoring space</span><h1>Keep your career<br /><em>moving forward.</em></h1><p>Three small steps today can make your next opportunity feel a lot closer.</p></div><Link className="button button-primary" href="/mentors"><Icon name="compass" size={17} /> Find a mentor</Link></div>

    <div className="stat-grid">
      <div className="stat-card"><span className="stat-icon stat-icon-blue"><Icon name="flag" size={18} /></span><div><span className="stat-label">Career profile</span><strong>82% complete</strong><div className="mini-progress"><span style={{ width: "82%" }} /></div></div><span className="stat-trend">+12%</span></div>
      <div className="stat-card"><span className="stat-icon stat-icon-green"><Icon name="heart" size={18} /></span><div><span className="stat-label">Mentorship health</span><strong>On track</strong><span className="stat-helper">1 active relationship</span></div><span className="health-pulse" /></div>
      <div className="stat-card"><span className="stat-icon stat-icon-amber"><Icon name="check" size={18} /></span><div><span className="stat-label">Actions completed</span><strong>7 of 10</strong><span className="stat-helper">This semester</span></div><span className="stat-trend">+3</span></div>
    </div>

    <div className="dashboard-grid">
      <section className="panel panel-featured"><SectionHeading eyebrow="Next on your calendar" title="Your next session" action={<Link className="text-link" href="/mentorship">View mentorship <Icon name="arrow" size={15} /></Link>} />
        <div className="session-card"><div className="session-date"><strong>28</strong><span>SEP</span></div><div className="session-details"><div className="session-title-row"><h3>Portfolio review &amp; next steps</h3><StatusBadge>Confirmed</StatusBadge></div><p><Avatar initials="MC" tone="rose" size="sm" /> with <strong>Meera Chawla</strong> · Product Designer at Figma</p><div className="session-meta"><span><Icon name="clock" size={15} /> 6:00 – 6:45 PM</span><span><Icon name="message" size={15} /> Alma video room</span></div></div><button aria-label="More session options" className="plain-icon-button" type="button"><Icon name="more" size={18} /></button></div>
        <div className="up-next"><span className="up-next-label">Before you meet</span><span>Share your latest portfolio link</span><button aria-label="Mark action complete" className="check-button" type="button"><Icon name="check" size={14} /></button></div>
      </section>

      <section className="panel panel-goals"><SectionHeading eyebrow="Keep the momentum" title="Your goals" action={<Link className="text-link" href="/mentorship">See all <Icon name="arrow" size={15} /></Link>} />
        <div className="goal-summary"><span className="goal-ring"><strong>70</strong><small>%</small></span><div><strong>Good progress, Aarav</strong><p>3 actions left this month</p></div></div>
        <div className="goal-row"><span className="goal-marker goal-marker-purple" /><div><strong>Land a product internship</strong><span>4 of 6 actions complete</span></div><span className="goal-percent">67%</span></div>
        <div className="goal-row"><span className="goal-marker goal-marker-orange" /><div><strong>Build my product portfolio</strong><span>3 of 4 actions complete</span></div><span className="goal-percent">75%</span></div>
      </section>
    </div>

    <section className="panel recommendations-panel"><SectionHeading eyebrow="Based on your career profile" title="Mentors worth meeting" action={<Link className="text-link" href="/mentors">Explore all mentors <Icon name="arrow" size={15} /></Link>} />
      <div className="mentor-strip">
        <div className="compact-mentor"><Avatar initials="RK" tone="blue" size="lg" /><div><div className="mentor-name-line"><strong>Rohan Kapoor</strong><span className="verified-chip"><Icon name="shield" size={12} /> Verified</span></div><span>Senior Product Manager · Microsoft</span><small>Product strategy · 5+ yrs mentoring</small></div><span className="match-score">94%<small>match</small></span></div>
        <div className="compact-mentor"><Avatar initials="NP" tone="purple" size="lg" /><div><div className="mentor-name-line"><strong>Nisha Patel</strong><span className="verified-chip"><Icon name="shield" size={12} /> Verified</span></div><span>UX Researcher · Atlassian</span><small>Design research · Portfolio reviews</small></div><span className="match-score">91%<small>match</small></span></div>
        <div className="compact-mentor"><Avatar initials="VI" tone="green" size="lg" /><div><div className="mentor-name-line"><strong>Vikram Iyer</strong><span className="verified-chip"><Icon name="shield" size={12} /> Verified</span></div><span>Data Scientist · Adobe</span><small>Career pivots · Interview prep</small></div><span className="match-score">88%<small>match</small></span></div>
      </div>
    </section>
  </AppShell>;
}
