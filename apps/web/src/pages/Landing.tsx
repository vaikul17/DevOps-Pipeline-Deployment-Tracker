import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Inline SVG icons ─────────────────────────────────────────── */
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);
const Rocket = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
);
const GitBranch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
);
const Shield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
);
const BarChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
);
const Zap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
);
const Activity = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);
const Globe = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
);
const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const Play = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);

/* ── Floating Nodes ───────────────────────────────────────────── */
const NODES = [
  { label: 'Production', value: '99.9%', x: '8%', y: '18%', delay: 0 },
  { label: 'Staging', value: '47 deploys', x: '78%', y: '14%', delay: 0.4 },
  { label: 'CI/CD', value: 'Active', x: '5%', y: '62%', delay: 0.8 },
  { label: 'Monitoring', value: '0 alerts', x: '82%', y: '58%', delay: 1.2 },
];

/* ── Stats Counter Hook ───────────────────────────────────────── */
function useCounter(end: number, duration: number, startOnView: boolean) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView, started]);

  useEffect(() => {
    if (!started) return;
    let frame: number;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [started, end, duration]);

  return { count, ref };
}

/* ── Scroll-reveal Hook ───────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

/* ── Logo Brand ───────────────────────────────────────────────── */
function Logo() {
  return (
    <div className="lp-logo">
      <div className="lp-logo-icon">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="url(#logoGrad)" strokeWidth="2.5" />
          <path d="M10 16 L14 20 L22 12" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="lp-logo-text">SEQA</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const stat1 = useCounter(99, 2000, true);
  const stat2 = useCounter(4200, 2000, true);
  const stat3 = useCounter(52, 2000, true);

  const feat1 = useReveal();
  const feat2 = useReveal();
  const feat3 = useReveal();
  const feat4 = useReveal();
  const metrics = useReveal();
  const cta = useReveal();

  return (
    <div className="lp-root">
      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
        <Logo />
        <div className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#metrics">Metrics</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <a href="#features" className="lp-nav-cta-pill">
            <Rocket /> Pipeline Tracker <ArrowRight />
          </a>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-btn-ghost" onClick={() => navigate('/login')}>Log In</button>
          <button className="lp-btn-primary-sm" onClick={() => navigate('/login')}>
            Get Started <ArrowRight />
          </button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="lp-hero">
        {/* Animated gradient orbs */}
        <div
          className="lp-hero-orb lp-hero-orb-1"
          style={{ transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 20}px)` }}
        />
        <div
          className="lp-hero-orb lp-hero-orb-2"
          style={{ transform: `translate(${-mousePos.x * 20}px, ${mousePos.y * 15}px)` }}
        />
        <div className="lp-hero-orb lp-hero-orb-3" />

        {/* Grid overlay */}
        <div className="lp-hero-grid" />

        {/* Floating Nodes */}
        {NODES.map((node, i) => (
          <div
            key={i}
            className="lp-floating-node"
            style={{ left: node.x, top: node.y, animationDelay: `${node.delay}s` }}
          >
            <div className="lp-floating-node-dot" />
            <div className="lp-floating-node-info">
              <span className="lp-floating-node-label">• {node.label}</span>
              <span className="lp-floating-node-value">{node.value}</span>
            </div>
          </div>
        ))}

        {/* Hero Content */}
        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <Rocket /> Track Your Deployments in Real-Time <ArrowRight />
          </div>
          <h1 className="lp-hero-title">
            One Platform for<br />
            <span className="lp-hero-title-gradient">Release Intelligence</span>
          </h1>
          <p className="lp-hero-subtitle">
            Visualize every deployment, track rollbacks, and measure DORA metrics
            across all your environments — from staging to production.
          </p>
          <div className="lp-hero-buttons">
            <button className="lp-btn-primary" onClick={() => navigate('/login')}>
              Open Dashboard <ArrowRight />
            </button>
            <button className="lp-btn-outline">
              <Play /> Watch Demo
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="lp-scroll-indicator">
          <span>01/04 • Scroll down</span>
          <ChevronDown />
        </div>
      </section>

      {/* ── LOGO STRIP ─────────────────────────────────────── */}
      <section className="lp-logos">
        <p className="lp-logos-label">Trusted by teams using</p>
        <div className="lp-logos-strip">
          {['Vercel', 'GitHub Actions', 'GitLab CI', 'Jenkins', 'ArgoCD', 'CircleCI'].map(name => (
            <span key={name} className="lp-logos-item">{name}</span>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section className="lp-features" id="features">
        <div className="lp-section-header">
          <span className="lp-section-tag">Features</span>
          <h2 className="lp-section-title">
            Meet <span className="lp-hero-title-gradient">Marvellous</span> Insights
          </h2>
          <p className="lp-section-subtitle">
            Save your team's precious time. Config replaces the lengthy process of manual tracking.
          </p>
        </div>

        <div className="lp-features-grid">
          <div ref={feat1.ref} className={`lp-feature-card ${feat1.visible ? 'lp-reveal' : ''}`}>
            <div className="lp-feature-icon lp-feature-icon-green"><Activity /></div>
            <h3>Deployment Timeline</h3>
            <p>Visualize every deployment as an interactive, real-time timeline. Hover for details, click to rollback — all in one glance.</p>
          </div>
          <div ref={feat2.ref} className={`lp-feature-card ${feat2.visible ? 'lp-reveal' : ''}`} style={{ animationDelay: '0.1s' }}>
            <div className="lp-feature-icon lp-feature-icon-blue"><BarChart /></div>
            <h3>DORA Metrics</h3>
            <p>Automatically computed Deployment Frequency, Lead Time, MTTR, and Change Failure Rate with trend indicators and performance ratings.</p>
          </div>
          <div ref={feat3.ref} className={`lp-feature-card ${feat3.visible ? 'lp-reveal' : ''}`} style={{ animationDelay: '0.2s' }}>
            <div className="lp-feature-icon lp-feature-icon-purple"><Shield /></div>
            <h3>Instant Rollbacks</h3>
            <p>One-click rollback to any previous deployment. Full audit trail with reason tracking and category classification.</p>
          </div>
          <div ref={feat4.ref} className={`lp-feature-card ${feat4.visible ? 'lp-reveal' : ''}`} style={{ animationDelay: '0.3s' }}>
            <div className="lp-feature-icon lp-feature-icon-amber"><Globe /></div>
            <h3>Multi-Provider</h3>
            <p>Connect Vercel, GitHub Actions, GitLab CI, Jenkins, and more. Unified view regardless of your CI/CD stack.</p>
          </div>
        </div>
      </section>

      {/* ── METRICS / STATS ────────────────────────────────── */}
      <section className="lp-metrics" id="metrics" ref={metrics.ref}>
        <div className={`lp-metrics-inner ${metrics.visible ? 'lp-reveal' : ''}`}>
          <div className="lp-metrics-left">
            <span className="lp-section-tag">Real-time Analytics</span>
            <h2 className="lp-section-title" style={{ textAlign: 'left' }}>
              Your Pipeline<br />
              <span className="lp-hero-title-gradient">Financial Growth</span>
            </h2>
            <p className="lp-section-subtitle" style={{ textAlign: 'left' }}>
              Monitor your deployment pipeline health in real-time with enterprise-grade
              analytics. Get actionable insights, not just data.
            </p>
          </div>
          <div className="lp-metrics-grid">
            <div className="lp-metric-card" ref={stat1.ref}>
              <span className="lp-metric-value">{stat1.count}.9<span className="lp-metric-unit">%</span></span>
              <span className="lp-metric-label">Uptime SLA</span>
              <div className="lp-metric-bar"><div className="lp-metric-bar-fill" style={{ width: '99.9%' }} /></div>
            </div>
            <div className="lp-metric-card" ref={stat2.ref}>
              <span className="lp-metric-value">+{stat2.count.toLocaleString()}</span>
              <span className="lp-metric-label">Deployments Tracked</span>
              <div className="lp-metric-bar"><div className="lp-metric-bar-fill lp-metric-bar-blue" style={{ width: '78%' }} /></div>
            </div>
            <div className="lp-metric-card" ref={stat3.ref}>
              <span className="lp-metric-value">{stat3.count}<span className="lp-metric-unit">ms</span></span>
              <span className="lp-metric-label">Avg Response Time</span>
              <div className="lp-metric-bar"><div className="lp-metric-bar-fill lp-metric-bar-purple" style={{ width: '45%' }} /></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PIPELINE PREVIEW ───────────────────────────────── */}
      <section className="lp-preview">
        <div className="lp-preview-content">
          <span className="lp-section-tag">Pipeline Overview</span>
          <h2 className="lp-section-title">
            Track Every Stage of Your<br />
            <span className="lp-hero-title-gradient">Release Pipeline</span>
          </h2>
          <div className="lp-pipeline-visual">
            {['Build', 'Test', 'Stage', 'Deploy', 'Monitor'].map((stage, i) => (
              <div key={stage} className="lp-pipeline-stage" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className={`lp-pipeline-dot ${i < 4 ? 'lp-pipeline-dot-done' : 'lp-pipeline-dot-active'}`}>
                  {i < 4 ? <Check /> : <Zap />}
                </div>
                <span className="lp-pipeline-label">{stage}</span>
                {i < 4 && <div className="lp-pipeline-connector" />}
              </div>
            ))}
          </div>

          {/* Mini dashboard preview */}
          <div className="lp-dash-preview">
            <div className="lp-dash-row">
              <div className="lp-dash-cell">
                <span className="lp-dash-cell-label">Deploy Frequency</span>
                <span className="lp-dash-cell-value">3.2/day</span>
                <span className="lp-dash-cell-badge lp-dash-cell-badge-green">Elite</span>
              </div>
              <div className="lp-dash-cell">
                <span className="lp-dash-cell-label">Lead Time</span>
                <span className="lp-dash-cell-value">42 min</span>
                <span className="lp-dash-cell-badge lp-dash-cell-badge-green">Elite</span>
              </div>
              <div className="lp-dash-cell">
                <span className="lp-dash-cell-label">Change Failure</span>
                <span className="lp-dash-cell-value">2.1%</span>
                <span className="lp-dash-cell-badge lp-dash-cell-badge-blue">High</span>
              </div>
              <div className="lp-dash-cell">
                <span className="lp-dash-cell-label">MTTR</span>
                <span className="lp-dash-cell-value">18 min</span>
                <span className="lp-dash-cell-badge lp-dash-cell-badge-green">Elite</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────── */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-section-header">
          <span className="lp-section-tag">Pricing</span>
          <h2 className="lp-section-title">Simple, Transparent Pricing</h2>
          <p className="lp-section-subtitle">Start free. Scale as your team grows.</p>
        </div>
        <div className="lp-pricing-grid">
          <div className="lp-pricing-card">
            <h3>Starter</h3>
            <div className="lp-pricing-price">$0<span>/mo</span></div>
            <p className="lp-pricing-desc">For individual developers</p>
            <ul className="lp-pricing-list">
              <li><Check /> 3 Projects</li>
              <li><Check /> 1,000 Deployments/mo</li>
              <li><Check /> DORA Metrics</li>
              <li><Check /> Vercel Integration</li>
            </ul>
            <button className="lp-btn-outline lp-btn-full" onClick={() => navigate('/login')}>Get Started</button>
          </div>
          <div className="lp-pricing-card lp-pricing-card-featured">
            <div className="lp-pricing-popular">Most Popular</div>
            <h3>Pro</h3>
            <div className="lp-pricing-price">$29<span>/mo</span></div>
            <p className="lp-pricing-desc">For growing teams</p>
            <ul className="lp-pricing-list">
              <li><Check /> Unlimited Projects</li>
              <li><Check /> Unlimited Deployments</li>
              <li><Check /> Webhooks & Real-time</li>
              <li><Check /> Multi-environment</li>
              <li><Check /> Rollback Audit Trail</li>
              <li><Check /> Priority Support</li>
            </ul>
            <button className="lp-btn-primary lp-btn-full" onClick={() => navigate('/login')}>Start Free Trial</button>
          </div>
          <div className="lp-pricing-card">
            <h3>Enterprise</h3>
            <div className="lp-pricing-price">Custom</div>
            <p className="lp-pricing-desc">For large organizations</p>
            <ul className="lp-pricing-list">
              <li><Check /> Everything in Pro</li>
              <li><Check /> SSO / SAML</li>
              <li><Check /> Custom SLA</li>
              <li><Check /> Dedicated Support</li>
              <li><Check /> On-premise Option</li>
            </ul>
            <button className="lp-btn-outline lp-btn-full">Contact Sales</button>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="lp-faq" id="faq">
        <div className="lp-section-header">
          <span className="lp-section-tag">FAQ</span>
          <h2 className="lp-section-title">Frequently Asked Questions</h2>
        </div>
        <div className="lp-faq-list">
          <FAQItem q="What CI/CD providers does SEQA support?" a="SEQA supports Vercel, GitHub Actions, GitLab CI, Jenkins, CircleCI, ArgoCD, and any custom provider through our webhook API." />
          <FAQItem q="How does the Vercel integration work?" a="Simply paste your Vercel API token and Project ID in the Integrations modal. SEQA will pull all historical deployments and optionally receive real-time webhook events." />
          <FAQItem q="What are DORA metrics?" a="DORA (DevOps Research and Assessment) metrics include Deployment Frequency, Lead Time for Changes, Mean Time to Recovery, and Change Failure Rate — the four key metrics that measure software delivery performance." />
          <FAQItem q="Is my data secure?" a="Absolutely. All API tokens are encrypted at rest and in transit. SEQA never stores your source code — only deployment metadata." />
          <FAQItem q="Can I self-host SEQA?" a="Yes! SEQA is built as a monorepo with a React frontend and Express API. You can deploy it anywhere — Render, Railway, your own servers." />
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────── */}
      <section className="lp-cta" ref={cta.ref}>
        <div className={`lp-cta-inner ${cta.visible ? 'lp-reveal' : ''}`}>
          <h2>Ready to Ship with Confidence?</h2>
          <p>Join thousands of developers who trust SEQA to track their release pipelines.</p>
          <div className="lp-hero-buttons" style={{ justifyContent: 'center' }}>
            <button className="lp-btn-primary" onClick={() => navigate('/login')}>
              Start Tracking Free <ArrowRight />
            </button>
            <button className="lp-btn-outline">
              <GitBranch /> View Documentation
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <Logo />
            <p>Release Pipeline Visualizer for modern DevOps teams.</p>
          </div>
          <div className="lp-footer-links">
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#metrics">Analytics</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div>
              <h4>Resources</h4>
              <a href="#faq">FAQ</a>
              <a href="#">Documentation</a>
              <a href="#">Changelog</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 SEQA. All rights reserved.</span>
          <div className="lp-footer-social">
            <a href="#">Support</a>
            <a href="#">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── FAQ Accordion Item ───────────────────────────────────────── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-faq-item ${open ? 'lp-faq-item-open' : ''}`} onClick={() => setOpen(!open)}>
      <div className="lp-faq-q">
        <span>{q}</span>
        <span className="lp-faq-toggle">{open ? '−' : '+'}</span>
      </div>
      <div className="lp-faq-a">{a}</div>
    </div>
  );
}
