import { useState } from "react";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

interface PlanType {
  id: "monthly" | "yearly";
  label: string;
  price: string;
  sub: string;
  badge?: string;
}

const PLANS: PlanType[] = [
  { id: "monthly", label: "Monthly", price: "£25", sub: "/month · up to 20 staff" },
  { id: "yearly", label: "Yearly", price: "£240", sub: "/year · save £60", badge: "Best Value" },
];

interface CreateAccountModalProps {
  onClose: () => void;
}

function CreateAccountModal({ onClose }: CreateAccountModalProps) {
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [form, setForm] = useState({ company: "", email: "", password: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate async call
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors text-2xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">You're on the list!</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              We'll be in touch at <strong>{form.email}</strong> to activate your free 7-day trial for <strong>{form.company}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h2>
            <p className="text-slate-500 text-sm mb-6">7-day free trial · No credit card required</p>

            {/* Plan picker */}
            <div className="flex gap-3 mb-6">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className={`flex-1 relative rounded-xl border-2 p-3 text-left transition-all ${
                    plan === p.id
                      ? "border-cyan-500 bg-cyan-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {p.badge && (
                    <span className="absolute -top-2.5 right-3 bg-cyan-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {p.badge}
                    </span>
                  )}
                  <div className="text-sm font-semibold text-slate-700">{p.label}</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{p.price}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.sub}</div>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="company">
                  Company name
                </label>
                <input
                  id="company"
                  type="text"
                  required
                  placeholder="Acme Ltd"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm mt-1"
              >
                {loading ? "Creating account…" : "Create account →"}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-4">
              By signing up you agree to our{" "}
              <a href="#" className="underline hover:text-slate-600">Terms</a> and{" "}
              <a href="#" className="underline hover:text-slate-600">Privacy Policy</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  const [showModal, setShowModal] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75V16.5zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">AccessGrid</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <button onClick={() => scrollTo("how-it-works")} className="hover:text-slate-900 transition-colors">How it works</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-slate-900 transition-colors">Pricing</button>
            <button onClick={onEnterApp} className="hover:text-slate-900 transition-colors">Open Kiosk</button>
          </nav>
          <button
            onClick={() => setShowModal(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Start Free Trial
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-slate-950">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-cyan-400 text-sm font-medium">Live attendance tracking — free 7-day trial</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6 max-w-4xl mx-auto">
            Track staff attendance{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              in seconds
            </span>
            <br />no spreadsheets, no paperwork
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Staff scan a QR code to check in and out. You get real-time logs, exports, and full visibility — from any device, instantly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5"
            >
              Start Free Trial →
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-base transition-all"
            >
              See How It Works
            </button>
          </div>

          <p className="text-slate-600 text-sm mt-5">No credit card required · Setup in under 5 minutes</p>
        </div>

        {/* Dashboard screenshot */}
        <div className="relative max-w-5xl mx-auto px-6 mt-16">
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl shadow-black/60">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none" style={{ top: "60%" }} />
            <img
              src={dashboardPreview}
              alt="AccessGrid dashboard"
              className="w-full h-auto block"
            />
          </div>
          {/* Floating stat cards */}
          <div className="absolute -left-2 top-8 md:left-4 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 hidden md:flex">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-sm">✓</div>
            <div>
              <div className="text-xs text-slate-500">Checked in today</div>
              <div className="text-lg font-bold text-slate-900">24 staff</div>
            </div>
          </div>
          <div className="absolute -right-2 top-16 md:right-4 bg-white rounded-xl shadow-xl px-4 py-3 hidden md:flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center text-violet-600 font-bold text-sm">↗</div>
            <div>
              <div className="text-xs text-slate-500">Avg check-in time</div>
              <div className="text-lg font-bold text-slate-900">08:47 AM</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Live in 3 steps</h2>
            <p className="text-slate-500 text-lg">From zero to tracking in under 5 minutes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Add your staff",
                desc: "Enter staff names, emails, and departments. AccessGrid generates a unique QR badge for each person automatically.",
                color: "from-cyan-400 to-cyan-600",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Staff scan their QR badge",
                desc: "Mount a tablet as your kiosk. Staff hold their QR code up to the camera — check-in or check-out is recorded in under a second.",
                color: "from-blue-400 to-blue-600",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "You see everything, live",
                desc: "Real-time dashboard shows who's in, who's out, and shift durations. Filter by date or department. Export to CSV in one click.",
                color: "from-violet-400 to-violet-600",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="bg-slate-50 rounded-2xl p-8 h-full border border-slate-100 hover:border-slate-200 transition-all hover:shadow-md">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center mb-5`}>
                    {item.icon}
                  </div>
                  <div className="text-xs font-bold text-slate-400 tracking-widest mb-2">STEP {item.step}</div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Built for busy teams</h2>
            <p className="text-slate-400 text-lg">Not another clunky HR system — just what you actually need.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "No more manual registers",
                desc: "Eliminate paper sign-in sheets and the end-of-day scramble to total up hours.",
                emoji: "📋",
              },
              {
                title: "Works on any tablet",
                desc: "Just open a browser, mount a tablet at reception, and you're live — no special hardware required.",
                emoji: "📱",
              },
              {
                title: "Export in seconds",
                desc: "Need payroll data? Download a CSV of the full attendance log filtered by date, department, or person.",
                emoji: "📊",
              },
              {
                title: "Syncs across devices",
                desc: "Run multiple kiosks at different entrances. All data flows to one real-time dashboard.",
                emoji: "🔄",
              },
              {
                title: "QR codes in bulk",
                desc: "Print and distribute QR badges for your entire team in minutes — individually or as a ZIP download.",
                emoji: "🖨️",
              },
              {
                title: "PIN-protected admin",
                desc: "Your kiosk stays in staff mode. Only managers with the PIN can access attendance data and settings.",
                emoji: "🔒",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all"
              >
                <div className="text-3xl mb-4">{b.emoji}</div>
                <h3 className="text-white font-bold text-base mb-2">{b.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Simple, honest pricing</h2>
            <p className="text-slate-500 text-lg">One plan. Everything included. No surprises.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
            {/* Monthly */}
            <div className="flex-1 max-w-xs border-2 border-slate-200 rounded-2xl p-8">
              <div className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Monthly</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-slate-900">£25</span>
                <span className="text-slate-500 pb-1">/month</span>
              </div>
              <div className="text-slate-500 text-sm mb-6">Up to 20 staff members</div>
              <ul className="space-y-3 mb-8 text-sm text-slate-600">
                {["Unlimited check-ins & check-outs", "Real-time dashboard", "CSV exports", "QR badge generation", "Cloud sync across kiosks", "7-day free trial"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowModal(true)}
                className="w-full border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Start free trial
              </button>
            </div>

            {/* Yearly */}
            <div className="flex-1 max-w-xs border-2 border-cyan-500 rounded-2xl p-8 relative bg-gradient-to-b from-cyan-50 to-white shadow-lg shadow-cyan-100">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                BEST VALUE · SAVE £60
              </div>
              <div className="text-sm font-semibold text-cyan-600 mb-3 uppercase tracking-wider">Yearly</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-slate-900">£240</span>
                <span className="text-slate-500 pb-1">/year</span>
              </div>
              <div className="text-slate-500 text-sm mb-6">Up to 20 staff · only £20/month</div>
              <ul className="space-y-3 mb-8 text-sm text-slate-600">
                {["Unlimited check-ins & check-outs", "Real-time dashboard", "CSV exports", "QR badge generation", "Cloud sync across kiosks", "7-day free trial"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowModal(true)}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Start free trial
              </button>
            </div>
          </div>

          <p className="text-center text-slate-400 text-sm mt-8">
            Need more than 20 staff?{" "}
            <a href="mailto:hello@accessgrid.app" className="text-cyan-600 hover:underline">Get in touch</a>
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 rounded-3xl p-14">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Ready to ditch the clipboard?
            </h2>
            <p className="text-slate-400 text-lg mb-10">
              Join teams who've already switched to QR-based attendance. 7-day free trial. No card needed.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold px-10 py-4 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-0.5"
            >
              Create Your Account →
            </button>
            <p className="text-slate-600 text-sm mt-5">Setup takes under 5 minutes</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <rect x="2" y="2" width="6" height="6" rx="1" />
                <rect x="12" y="2" width="6" height="6" rx="1" />
                <rect x="2" y="12" width="6" height="6" rx="1" />
                <rect x="12" y="12" width="3" height="3" rx="0.5" />
                <rect x="17" y="12" width="3" height="3" rx="0.5" />
                <rect x="12" y="17" width="3" height="3" rx="0.5" />
                <rect x="17" y="17" width="3" height="3" rx="0.5" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm">AccessGrid</span>
          </div>
          <p className="text-slate-600 text-sm">© {new Date().getFullYear()} AccessGrid. All rights reserved.</p>
          <div className="flex gap-6 text-slate-500 text-sm">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            <a href="mailto:hello@accessgrid.app" className="hover:text-slate-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {showModal && <CreateAccountModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
