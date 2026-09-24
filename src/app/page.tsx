import Link from "next/link";
import { Icon } from "./_components/icons";

const demoPages = [
  { href: "/dashboard", number: "01", title: "Student dashboard", text: "A calm starting point for a student to see their next useful action.", icon: "home" as const, tag: "Student view" },
  { href: "/mentors", number: "02", title: "Mentor discovery", text: "Explainable matching with visible capacity, expertise, and trust signals.", icon: "compass" as const, tag: "M3 · M4" },
  { href: "/mentorship", number: "03", title: "Active mentorship", text: "A relationship workspace for sessions, goals, actions, and private messages.", icon: "heart" as const, tag: "M5 · M6 · M7" },
  { href: "/analytics", number: "04", title: "Programme analytics", text: "An institution-facing view of participation, engagement, and mentor capacity.", icon: "trend" as const, tag: "M8 · M10" },
];

export default function Home() {
  return (
    <main className="cover-page">
      <div className="cover-topbar">
        <Link className="brand brand-dark" href="/"><span className="brand-mark"><Icon name="spark" size={18} /></span><span>alma<span className="brand-dot">.</span></span></Link>
        <span className="cover-meta">Project 11 · Demo screens</span>
      </div>
      <section className="cover-hero">
        <div className="cover-kicker"><span className="kicker-line" /> Verified alumni mentorship platform</div>
        <h1>Turn alumni goodwill<br /><em>into momentum.</em></h1>
        <p className="cover-lede">A considered mentoring network for students, alumni, and the teams who make meaningful connections possible.</p>
        <div className="cover-actions"><Link className="button button-primary" href="/dashboard">Open demo <Icon name="arrow" size={16} /></Link><span className="cover-caption"><Icon name="shield" size={16} /> Built around trust, capacity, and privacy</span></div>
      </section>
      <section className="demo-index" aria-labelledby="demo-pages-title">
        <div className="index-heading"><div><span className="section-eyebrow">Report-ready screens</span><h2 id="demo-pages-title">The mentoring journey, end to end</h2></div><span className="index-count">04 pages</span></div>
        <div className="demo-grid">
          {demoPages.map((page) => <Link className="demo-card" href={page.href} key={page.href}>
            <div className="demo-card-top"><span className="demo-number">{page.number}</span><span className="demo-icon"><Icon name={page.icon} size={20} /></span></div>
            <div><span className="demo-tag">{page.tag}</span><h3>{page.title}</h3><p>{page.text}</p></div>
            <span className="demo-link">View page <Icon name="arrow" size={15} /></span>
          </Link>)}
        </div>
      </section>
      <footer className="cover-footer"><span>ALMA NETWORK</span><span>Student · Alumni · Institution</span><span>v0.1 concept</span></footer>
    </main>
  );
}
