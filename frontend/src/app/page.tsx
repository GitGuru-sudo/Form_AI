import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HomeAuthHandler } from "@/components/AuthGuard"
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
        <section className="relative container mx-auto px-6 py-24 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/20 blur-[120px] rounded-full -z-10" />
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400 mb-8">
              <Sparkles className="h-4 w-4" />
              <span>Next-Gen Form Builder</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
              Build Forms with AI in Seconds
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
              The easiest way to create powerful, beautiful forms. Just describe what you need, and let FormAI handle the rest.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold group border-0">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-lg font-semibold">
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
            <FeatureCard 
              icon={<Sparkles className="h-6 w-6 text-indigo-400" />}
              title="AI Generation"
              description="Describe your form in plain English and watched it get created instantly with optimized question types."
            />
            <FeatureCard 
              icon={<Layout className="h-6 w-6 text-indigo-400" />}
              title="14+ Question Types"
              description="From simple text fields to complex rating scales and file uploads, we have it all covered."
            />
            <FeatureCard 
              icon={<ArrowRight className="h-6 w-6 text-indigo-400" />}
              title="Drag & Drop Editor"
              description="Fine-tune your generated forms with our intuitive drag-and-drop builder. Reorder, add, or remove fields with ease."
            />
            <FeatureCard 
              icon={<Zap className="h-6 w-6 text-indigo-400" />}
              title="Real-time Responses"
              description="Monitor responses as they come in. Beautifully formatted tables help you digest data quickly."
            />
            <FeatureCard 
              icon={<Share2 className="h-6 w-6 text-indigo-400" />}
              title="Shareable Links"
              description="Get a public link for your form instantly. No coding required, just publish and share."
            />
            <FeatureCard 
              icon={<ShieldCheck className="h-6 w-6 text-indigo-400" />}
              title="Zero-Login Filling"
              description="Make it easy for your respondents. They can fill out forms without creating an account."
            />
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="bg-slate-900/30 py-24">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Three Simple Steps</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Go from idea to published form in under a minute.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <Step number="1" title="Chat" description="Describe your form requirements to our AI assistant in a natural conversation." />
              <Step number="2" title="Preview" description="Visualise your form, edit questions, and customize field settings in real-time." />
              <Step number="3" title="Share" description="Publish your form and share the public link with your audience or via email." />
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="container mx-auto px-6 py-24 text-center">
          <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-transparent p-12 md:p-24 overflow-hidden relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full -z-10" />
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to build your first form?</h2>
            <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">Join thousands of creators using FormAI to build better experiences for their users.</p>
            <Link href="/sign-up">
              <Button size="lg" className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold border-0">
                Create Your Free Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-6 py-12 border-t border-slate-900/50 flex flex-col md:row items-center justify-between gap-6 text-sm text-slate-500">
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

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:bg-slate-900 transition-all hover:border-slate-700">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="relative">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-800 bg-slate-950 text-2xl font-bold text-indigo-500">
        {number}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 max-w-xs mx-auto">{description}</p>
    </div>
  )
}
