# Landing Page — Animation & Polish

> Status: Not started. Effort: M. Area: Marketing / brand.

## Goal
Make the FormAI landing page (`frontend/src/app/page.tsx`) feel alive and premium without redesigning it: add a reveal-on-scroll entrance for the Features cards and How-It-Works steps, an animated aurora glow + staggered fade-up entrance in the hero, and hover micro-interactions on cards and CTA buttons. Stay on the existing dark `slate-950` / `indigo-600` aesthetic, add **zero new dependencies** (primary path), and fully respect `prefers-reduced-motion`.

## Approach (decision)
**Primary (recommended): CSS-only + `tailwindcss-animate`** (already installed/configured). Keep `page.tsx` a server component; the only new client code is one tiny `IntersectionObserver` wrapper, `frontend/src/components/Reveal.tsx` (`"use client"`), used to fade+translate children in once when scrolled into view. Entrance/ambient effects (aurora drift, float, shimmer, fade-up) are pure CSS keyframes added to `tailwind.config.ts` + `globals.css`, driven by utility classes and `style={{ animationDelay }}` for stagger. This is the lowest-risk option: no new bundle weight, no forced client conversion of the whole page, and reduced-motion is one global guard.

**Optional (clearly labeled): `framer-motion`** — richer spring physics and `whileInView` stagger, but it adds a dependency and forces any component using it to become `"use client"`. Documented at the end with the exact install and two example conversions. Skip unless you want spring feel; the primary approach covers all required animations.

## Dependencies to install
**None for the primary approach.** `tailwindcss-animate@^1.0.7` is already a dependency and already registered in `tailwind.config.ts` plugins.

Optional only (framer-motion path):
```bash
cd frontend && npm i framer-motion --legacy-peer-deps
```

## Files touched
- `frontend/src/components/Reveal.tsx` — **new** — client `IntersectionObserver` wrapper for scroll-reveal stagger.
- `frontend/tailwind.config.ts` — **edit** — add `theme.extend.keyframes` + `animation` (aurora, float, shimmer, fade-up, gradient-x).
- `frontend/src/app/globals.css` — **edit** — add the `bg-300%` sizing utility for gradient text + extend the reduced-motion guard.
- `frontend/src/app/page.tsx` — **edit** — wrap Features cards & Steps in `<Reveal>`, animate hero (aurora, badge float, staggered fade-up), enhance `FeatureCard` hover lift, add CTA sheen, animate Step badges + connector.

---

## Step-by-step

### Step 1 — Create the scroll-reveal client component (`frontend/src/components/Reveal.tsx`)

Create `frontend/src/components/Reveal.tsx` with full contents:

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface RevealProps {
  children: React.ReactNode
  /** Stagger delay in seconds. */
  delay?: number
  /** Extra classes applied to the wrapper. */
  className?: string
  /** Re-run the reveal every time it enters the viewport. Default: once. */
  once?: boolean
}

/**
 * Fades + lifts its children into view the first time they intersect the
 * viewport. Server-rendered as visible-but-offset; the observer adds the
 * "in view" state on the client. Honors prefers-reduced-motion via the
 * motion-reduce: utilities below (children render fully visible, no transform).
 */
export function Reveal({ children, delay = 0, className, once = true }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect reduced motion: show immediately, skip the observer entirely.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            if (once) observer.disconnect()
          } else if (!once) {
            setShown(false)
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}s` : "0s" }}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        "motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className
      )}
    >
      {children}
    </div>
  )
}
```

Notes:
- Uses a CSS `transition` (not a keyframe) so the offset state is server-rendered and there is **no hydration mismatch** — the element renders at `opacity-0 translate-y-6` on both server and client, then the client toggles `shown`.
- `cn` already exists at `@/lib/utils` (imported by `button.tsx`).
- `motion-reduce:` utilities ship with Tailwind core; combined with the early `matchMedia` return, reduced-motion users see content instantly with no transform.

---

### Step 2 — Add keyframes & animations to `frontend/tailwind.config.ts`

**Find** (the `extend` block — anchor on the closing of `colors` and the `extend`/`theme` close):

```ts
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
```

**Replace with**:

```ts
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      keyframes: {
        aurora: {
          "0%, 100%": { transform: "translate(-50%, 0) scale(1)", opacity: "0.5" },
          "50%": { transform: "translate(-50%, -6%) scale(1.15)", opacity: "0.8" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        aurora: "aurora 8s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease infinite",
        "fade-up": "fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
```

These names do not collide with anything existing (the only prior keyframe, `scale-in`, lives in `globals.css`, not the config).

---

### Step 3 — Add gradient-text sizing utility + reduced-motion guard (`frontend/src/app/globals.css`)

**3a. Add a `bg-300%` utility** (needed so the animated gradient on the h1 has room to travel). 

**Find**:

```css
  /* Render native date/time picker controls for a dark surface. */
  .inv-color-scheme {
    color-scheme: dark;
  }
}
```

**Replace with**:

```css
  /* Render native date/time picker controls for a dark surface. */
  .inv-color-scheme {
    color-scheme: dark;
  }

  /* Oversized background for animated gradient text (animate-gradient-x). */
  .bg-300\% {
    background-size: 300% 300%;
  }
}
```

**3b. Extend the reduced-motion guard** so the new ambient/entrance animations are silenced globally (belt-and-suspenders alongside the `motion-reduce:` utilities and the `Reveal` early return).

**Find**:

```css
@media (prefers-reduced-motion: reduce) {
  .scale-in {
    animation: none;
  }
}
```

**Replace with**:

```css
@media (prefers-reduced-motion: reduce) {
  .scale-in,
  .animate-aurora,
  .animate-float,
  .animate-shimmer,
  .animate-gradient-x,
  .animate-fade-up {
    animation: none !important;
  }
}
```

---

### Step 4 — Hero: animated aurora, staggered fade-up, badge float (`frontend/src/app/page.tsx`)

**Find** (the entire hero `<section>`, lines 35–60):

```tsx
        {/* Hero Section */}
        <section className="relative container mx-auto px-6 py-24 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/20 blur-[120px] rounded-full -z-10" />
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400 mb-8">
              <Sparkles className="h-4 w-4" />
              <span>Next-Gen Form Builder</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white text-balance">
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
```

**Replace with**:

```tsx
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
```

Notes:
- The h1 now uses `bg-clip-text text-transparent` with an animated gradient (`animate-gradient-x` + `bg-300%`). Removed the literal `text-white` because the gradient supplies the color; for reduced-motion the gradient stays static (still legible white→indigo→white).
- `[animation-delay:0ms,200ms]` on the badge sets the first delay for `fade-up` (entrance) and the second for `float` (ambient) — Tailwind emits a comma-separated `animation-delay`, applied per-animation in order. If your Tailwind version does not parse the two-value arbitrary delay cleanly, simplify to `animate-float` only (drop the entrance on the badge); the float alone still reads well.
- Hero entrance animations run on mount (no observer needed — the hero is above the fold). They are server-render-safe: `animate-fade-up` uses `both` fill mode, so the element is correctly hidden at frame 0.

---

### Step 5 — Features grid: stagger reveals via `<Reveal>` (`frontend/src/app/page.tsx`)

This requires converting the six static `<FeatureCard>` calls into a data array + `.map()` so the index drives the stagger delay.

**5a. Add the `Reveal` import.** 

**Find** (line 3):

```tsx
import { HomeAuthHandler } from "@/components/AuthGuard"
```

**Replace with**:

```tsx
import { HomeAuthHandler } from "@/components/AuthGuard"
import { Reveal } from "@/components/Reveal"
```

**5b. Convert the Features grid to a mapped, revealed list.**

**Find** (the grid block, lines 68–99):

```tsx
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
```

**Replace with**:

```tsx
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Reveal key={feature.title} delay={(i % 3) * 0.1} className="h-full">
                <FeatureCard {...feature} />
              </Reveal>
            ))}
          </div>
```

**5c. Define the `features` data array** alongside the other module-level declarations. 

**Find** (the `FeatureCard` function definition, lines 152–162):

```tsx
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
```

**Replace with**:

```tsx
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
```

Notes:
- `delay={(i % 3) * 0.1}` staggers each row left→right (0, 0.1, 0.2s) and resets per row so lower rows don't wait on a large cumulative delay.
- `<Reveal>` is a client component but `FeatureCard` and the `features` array stay server-side; only the wrapper hydrates. `page.tsx` itself stays a **server component** (no `"use client"`).
- The icon JSX in `features` is created at module scope — fine, it's a plain React element, serialized through the server→client boundary as children of `FeatureCard`.

---

### Step 6 — How It Works: revealed, animated step badges + connector (`frontend/src/app/page.tsx`)

**6a. Wrap each Step in `<Reveal>`.**

**Find** (the steps grid, lines 109–113):

```tsx
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <Step number="1" title="Chat" description="Describe your form requirements to our AI assistant in a natural conversation." />
              <Step number="2" title="Preview" description="Visualise your form, edit questions, and customize field settings in real-time." />
              <Step number="3" title="Share" description="Publish your form and share the public link with your audience or via email." />
            </div>
```

**Replace with**:

```tsx
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              {/* Connector line behind the badges (desktop only) */}
              <div className="pointer-events-none absolute top-8 left-[16.66%] right-[16.66%] hidden md:block -z-0">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
              </div>
              <Reveal delay={0}><Step number="1" title="Chat" description="Describe your form requirements to our AI assistant in a natural conversation." /></Reveal>
              <Reveal delay={0.15}><Step number="2" title="Preview" description="Visualise your form, edit questions, and customize field settings in real-time." /></Reveal>
              <Reveal delay={0.3}><Step number="3" title="Share" description="Publish your form and share the public link with your audience or via email." /></Reveal>
            </div>
```

**6b. Polish the `Step` badge** with a hover ring + glow.

**Find** (the `Step` function, lines 164–174):

```tsx
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
```

**Replace with**:

```tsx
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
```

Note: the badge sits on `bg-slate-950`, which masks the connector line behind it (`z-10` on the Step, `-z-0` on the line) so the line reads as connecting the badges rather than crossing through them.

---

### Step 7 — CTA footer card: hover lift + animated glow (`frontend/src/app/page.tsx`)

**Find** (the CTA footer section, lines 118–129):

```tsx
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
```

**Replace with**:

```tsx
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
```

---

## Reduced motion
Three independent guards, so reduced-motion is honored even if one is missed:
1. **`Reveal.tsx`** early-returns `setShown(true)` when `matchMedia("(prefers-reduced-motion: reduce)")` matches — content shows instantly, observer never runs.
2. **`motion-reduce:` utilities** on the `Reveal` wrapper (`motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100`) neutralize the transition even before JS runs.
3. **Global `@media (prefers-reduced-motion: reduce)`** block in `globals.css` (Step 3b) sets `animation: none !important` on `animate-aurora/float/shimmer/gradient-x/fade-up`, killing all ambient + entrance keyframes. Hover transitions (lift/scale/sheen) are intentionally left on — they are user-initiated, not ambient, and remain accessible.

## Edge cases & notes
- **Hydration:** `Reveal` renders identical markup on server and client (`opacity-0 translate-y-6` initially); the visible state is applied only inside `useEffect`, so there is no server/client mismatch. The hero `animate-fade-up` uses `both` fill so it is hidden at frame 0 on first paint with no flash.
- **Layout shift (CLS):** All reveals animate `opacity` + `translateY` only — the element occupies its final box from first render, so no reflow. `FeatureCard` keeps `h-full` and the `Reveal` wrapper gets `h-full` so grid cells stay equal height.
- **Above-the-fold reveal trap:** Don't wrap the hero in `<Reveal>` — it's above the fold and an observer-gated fade could leave it briefly invisible on slow hydration. The hero uses mount-time `animate-fade-up` instead (Step 4).
- **`page.tsx` stays a server component.** Only `Reveal.tsx` is `"use client"`. `FeatureCard`, `Step`, and the `features` array remain server-side.
- **Arbitrary two-value `animation-delay`** (`[animation-delay:0ms,200ms]` on the badge): if your Tailwind build doesn't emit it cleanly, drop the badge's `animate-fade-up` and keep only `animate-float` — see the note in Step 4.
- **`bg-300%`** is escaped as `.bg-300\%` in CSS but written `bg-300%` in JSX `className` — Tailwind's arbitrary-class escaping is not involved here since it's a defined utility, so use it literally as `bg-300%`.
- **`overflow-hidden` on hero `<section>`** (added in Step 4) prevents the larger animated aurora from causing a horizontal scrollbar as it scales.

## Verification
- `cd frontend && rtk tsc` — no type errors (new `Reveal` props, `features` array typing).
- `cd frontend && rtk next build` — production build succeeds, no "use client" / server-component boundary errors, `page.tsx` still statically rendered.
- Manual (`npm run dev`, load `/`):
  - Hero badge floats; h1 gradient shimmers; badge/h1/subcopy/CTAs fade up in sequence on load.
  - Scroll down: Feature cards reveal in staggered left→right per row; Step badges reveal 1→2→3 with the connector line behind them.
  - Hover a FeatureCard: lifts + indigo border + icon scales. Hover a primary CTA: lifts + white sheen sweeps across.
  - DevTools → Rendering → "Emulate prefers-reduced-motion: reduce": all entrance/ambient motion stops, content fully visible, no missing/blank sections.
  - No console hydration warnings; no horizontal scrollbar; no layout shift as reveals fire.

---

## Optional: framer-motion path (NOT required)

Only if you want spring physics instead of CSS easing. Adds a dependency and forces `"use client"` on any file importing it.

Install:
```bash
cd frontend && npm i framer-motion --legacy-peer-deps
```

**Example A — Reveal replacement** (`frontend/src/components/Reveal.tsx`, full alternate contents):
```tsx
"use client"

import { motion } from "framer-motion"

interface RevealProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
```
framer-motion respects `prefers-reduced-motion` automatically when you wrap the tree in `<MotionConfig reducedMotion="user">`, or you can read `useReducedMotion()` and skip the offsets.

**Example B — hero h1 entrance** (drop-in, requires the hero block to live in a `"use client"` component or be extracted):
```tsx
<motion.h1
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
  className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white text-balance"
>
  Build Forms with AI in Seconds
</motion.h1>
```
Trade-off: converting the hero to use `motion.*` means that subtree becomes client-rendered. The primary CSS path avoids this entirely — prefer it unless spring feel is a hard requirement.
