import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HomeAuthHandler } from "@/components/AuthGuard"
import { Reveal } from "@/components/Reveal"
import { ArrowRight, Sparkles, Layout, Share2, ShieldCheck, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <>
      <HomeAuthHandler />
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      {/* Navbar */}
      <header className="container mx-auto flex items-center justify-between px-6 py-6 border-b border-slate-900/50">
        <div className="flex items-center gap-2 text-xl font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            F
          </div>
          FormAI
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-slate-400 hover:text-white">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">Get Started Free</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative container mx-auto px-6 py-24 text-center overflow-hidden">
          {/* Animated aurora glow */}
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/20 blur-[120px] rounded-full -z-10 animate-aurora" />
          <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-fuchsia-600/10 blur-[100px] rounded-full -z-10 animate-aurora [animation-delay:-3s]" />
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400 mb-8 animate-fade-up animate-float [animation-delay:0ms,200ms]">
              <Sparkles className="h-4 w-4" />
              <span>Next-Gen Form Builder</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-balance animate-fade-up [animation-delay:120ms] bg-gradient-to-r from-white via-indigo-200 to-white bg-300% bg-clip-text text-transparent animate-gradient-x">
              Build Forms with AI in Seconds
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto animate-fade-up [animation-delay:240ms]">
              The easiest way to create powerful, beautiful forms. Just describe what you need, and let FormAI handle the rest.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up [animation-delay:360ms]">
              <Link href="/sign-up">
                <Button size="lg" className="relative h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold group border-0 overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/30">
                  {/* Sheen sweep on hover */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-lg font-semibold transition-transform hover:-translate-y-0.5">
                See How It Works
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features for Modern Teams</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Everything you need to collect data, analyze responses, and grow your business.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Reveal key={feature.title} delay={(i % 3) * 0.1} className="h-full">
                <FeatureCard {...feature} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="bg-slate-900/30 py-24">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Three Simple Steps</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Go from idea to published form in under a minute.</p>
            </div>
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              {/* Connector line behind the badges (desktop only) */}
              <div className="pointer-events-none absolute top-8 left-[16.66%] right-[16.66%] hidden md:block -z-0">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
              </div>
              <Reveal delay={0}><Step number="1" title="Chat" description="Describe your form requirements to our AI assistant in a natural conversation." /></Reveal>
              <Reveal delay={0.15}><Step number="2" title="Preview" description="Visualise your form, edit questions, and customize field settings in real-time." /></Reveal>
              <Reveal delay={0.3}><Step number="3" title="Share" description="Publish your form and share the public link with your audience or via email." /></Reveal>
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="container mx-auto px-6 py-24 text-center">
          <Reveal>
            <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-transparent p-12 md:p-24 overflow-hidden relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full -z-10 animate-aurora" />
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to build your first form?</h2>
              <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">Join thousands of creators using FormAI to build better experiences for their users.</p>
              <Link href="/sign-up">
                <Button size="lg" className="relative h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold border-0 overflow-hidden group transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/30">
                  <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  Create Your Free Account
                </Button>
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="container mx-auto px-6 py-12 border-t border-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
        <div className="flex items-center gap-2 text-white font-bold">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-xs">
            F
          </div>
          FormAI
        </div>
        <div className="flex items-center gap-8">
          <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
          <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
          <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-white transition-colors">Terms</Link>
        </div>
        <p>© 2026 FormAI. All rights reserved.</p>
      </footer>
    </div>
    </>
  )
}

const features = [
  {
    icon: <Sparkles className="h-6 w-6 text-indigo-400" />,
    title: "AI Generation",
    description: "Describe your form in plain English and watched it get created instantly with optimized question types.",
  },
  {
    icon: <Layout className="h-6 w-6 text-indigo-400" />,
    title: "14+ Question Types",
    description: "From simple text fields to complex rating scales and file uploads, we have it all covered.",
  },
  {
    icon: <ArrowRight className="h-6 w-6 text-indigo-400" />,
    title: "Drag & Drop Editor",
    description: "Fine-tune your generated forms with our intuitive drag-and-drop builder. Reorder, add, or remove fields with ease.",
  },
  {
    icon: <Zap className="h-6 w-6 text-indigo-400" />,
    title: "Real-time Responses",
    description: "Monitor responses as they come in. Beautifully formatted tables help you digest data quickly.",
  },
  {
    icon: <Share2 className="h-6 w-6 text-indigo-400" />,
    title: "Shareable Links",
    description: "Get a public link for your form instantly. No coding required, just publish and share.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-indigo-400" />,
    title: "Zero-Login Filling",
    description: "Make it easy for your respondents. They can fill out forms without creating an account.",
  },
]

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group h-full rounded-2xl border border-slate-800 bg-slate-900/50 p-8 transition-all duration-300 hover:bg-slate-900 hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-950/40">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 transition-all duration-300 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="group relative z-10">
      <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-800 bg-slate-950 text-2xl font-bold text-indigo-500 transition-all duration-300 group-hover:border-indigo-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-indigo-600/30">
        <span className="absolute inset-0 rounded-full bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors" />
        {number}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 max-w-xs mx-auto">{description}</p>
    </div>
  )
}
