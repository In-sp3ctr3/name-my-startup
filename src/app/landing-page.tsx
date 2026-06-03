"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCircle2,
  Cpu,
  FileText,
  Lightbulb,
  Menu,
  Rocket,
  Waves
} from "lucide-react";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { PRODUCT_OFFER } from "@/lib/product-offer";
import landingStyles from "./landing-page.module.css";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

function cn(...tokens: Array<string | false | null | undefined>) {
  return tokens
    .flatMap((token) => (token ? token.split(" ") : []))
    .filter(Boolean)
    .map((token) => landingStyles[token] ?? token)
    .join(" ");
}

const navItems = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Examples", href: "#examples" },
  { label: "Pricing", href: "#pricing" }
];

const footerLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Refunds", href: "/refund-policy" },
  { label: "Contact", href: "/contact" }
];

const signupHref = "/start";
const loginHref = "/login";

const logoStrip = [
  { name: "Short", mark: "corner" },
  { name: "Clear", mark: "spark" },
  { name: "Memorable", mark: "peak" },
  { name: "Distinct", mark: "bars" },
  { name: "Easy to say", mark: "wave" },
  { name: "Ready to check", mark: "checkbox" }
];

const logoMarqueeItems = [...logoStrip, ...logoStrip, ...logoStrip];

const arrowPaths = {
  toHeadline: {
    viewBox: "0 0 360 190",
    delay: 0.55,
    headDelay: 0.72,
    path: "M236 56 C274 54 286 76 266 92 C246 108 278 128 316 126",
    maskWidth: 26,
    strokeWidth: 5,
    dash: "8 11"
  },
  toResults: {
    viewBox: "0 0 520 500",
    delay: 2.78,
    headDelay: 3.42,
    path: "M330 26 C420 30 502 86 508 166 C516 260 454 326 420 302 C390 276 424 238 487 264 C566 298 530 396 442 432 C410 444 386 450 370 456",
    maskWidth: 26,
    strokeWidth: 5,
    dash: "8 11"
  }
} as const;

const resultCards = [
  {
    name: "LumaDesk",
    vibe: "Premium",
    description: "Sleek, memorable, productivity-focused.",
    tone: "violet",
    icon: FileText
  },
  {
    name: "Restly",
    vibe: "Modern",
    description: "Clean, calm, and easy to remember.",
    tone: "teal",
    icon: Waves
  },
  {
    name: "PulseHaus",
    vibe: "Premium",
    description: "Distinctive, premium, built to scale.",
    tone: "orange",
    icon: Check
  }
];

const steps = [
  {
    number: "1",
    title: "Describe your startup",
    body: "Tell us what you’re building, who it’s for, and what matters most.",
    icon: Lightbulb
  },
  {
    number: "2",
    title: "We generate options",
    body: "Get names shaped around your industry, audience, tone, and constraints.",
    icon: Cpu
  },
  {
    number: "3",
    title: "Pick with confidence",
    body: "Compare domain, social, and risk signals before you commit.",
    icon: Check
  }
];

const examples = [
  {
    idea: "AI meeting summaries",
    shortlist: ["Meetwise", "Summarq", "Recaply"],
    vibe: "Clean",
    availability: "Promising",
    note: "Names stay short, clear, and close to the workflow buyers already understand."
  },
  {
    idea: "Modern project management",
    shortlist: ["Planora", "Taskwell", "Flowdo"],
    vibe: "Modern",
    availability: "Promising",
    note: "Options balance clarity with enough polish to feel like a serious SaaS product."
  },
  {
    idea: "Creator analytics platform",
    shortlist: ["Viewra", "Lenslab", "Statify"],
    vibe: "Bold",
    availability: "Needs review",
    note: "The shortlist keeps a sharper creator-tool feel while flagging checks that need attention."
  }
];

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "",
    description: "Best for trying the first idea.",
    features: [
      "First startup only",
      `${PRODUCT_OFFER.freeNameCount} name suggestions`,
      "Basic vibe matching",
      "Basic domain signal",
      "Save the preview names"
    ],
    cta: "Get started",
    href: signupHref
  },
  {
    name: PRODUCT_OFFER.paidPassName,
    price: PRODUCT_OFFER.paidPassPrice,
    cadence: "one-time",
    description: "Best when an idea feels real enough to check.",
    features: [
      `${PRODUCT_OFFER.paidNameCount} fresh name candidates`,
      "Domain checks across .com, .io, .ai, .app, .co, and more",
      "Social handle checks",
      `${PRODUCT_OFFER.checkedRecommendationCount} checked recommendation slots`,
      "Name confidence notes",
      "Save and compare your shortlist",
      PRODUCT_OFFER.includedReportName
    ],
    cta: PRODUCT_OFFER.paidPassCtaWithPrice,
    href: "/checkout/launch-pack",
    featured: true
  }
];

function Brand() {
  return (
    <span className={cn("brand")}>
      <span className={cn("brand-mark")} aria-hidden="true">
        <ArrowUpRight size={22} strokeWidth={3.2} absoluteStrokeWidth />
      </span>
      <span>Namelift</span>
    </span>
  );
}

function DottedArrow({
  className
}: {
  className: string;
}) {
  const reduceMotion = useReducedMotion();
  const isResultsArrow = className.includes("to-results");
  const arrow = isResultsArrow ? arrowPaths.toResults : arrowPaths.toHeadline;
  const maskId = isResultsArrow ? "results-arrow-reveal" : "headline-arrow-reveal";
  const markerId = isResultsArrow ? "results-arrow-head" : "headline-arrow-head";

  return (
    <motion.svg
      className={cn("story-arrow", className)}
      viewBox={arrow.viewBox}
      aria-hidden="true"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        delay: reduceMotion ? 0 : arrow.delay,
        duration: 0.01
      }}
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 34 34"
          refX="30"
          refY="17"
          markerWidth="34"
          markerHeight="34"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path
            className={cn("story-arrow-marker-head")}
            d="M4 5 L31 17 L4 29 C10 21 10 13 4 5 Z"
            fill="currentColor"
          />
        </marker>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <motion.path
            d={arrow.path}
            fill="none"
            stroke="#fff"
            strokeWidth={arrow.maskWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              delay: reduceMotion ? 0 : arrow.delay,
              duration: isResultsArrow ? 0.64 : 0.24,
              ease: [0.22, 0.9, 0.22, 1]
            }}
          />
        </mask>
      </defs>

      <path
        className={cn("story-arrow-dots")}
        d={arrow.path}
        fill="none"
        stroke="currentColor"
        strokeWidth={arrow.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={arrow.dash}
        mask={`url(#${maskId})`}
      />
      <motion.path
        className={cn("story-arrow-head-anchor")}
        d={arrow.path}
        fill="none"
        stroke="transparent"
        strokeWidth={arrow.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#${markerId})`}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: reduceMotion ? 0 : arrow.headDelay,
          duration: 0.12,
          ease: "easeOut"
        }}
      />
    </motion.svg>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const visibleClass = landingStyles["is-visible"] ?? "is-visible";

    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add(visibleClass));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(visibleClass);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -14% 0px", threshold: 0.16 }
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <main>
        <header className={cn("site-header")}>
          <Link href="/" aria-label="Namelift home">
            <Brand />
          </Link>

          <nav className={cn("desktop-nav")} aria-label="Primary navigation">
            {navItems.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className={cn("header-actions")}>
            <Link className={cn("login-link")} href={loginHref}>
              Log in
            </Link>
            <Link className={cn("button button-primary button-small")} href={signupHref}>
              Name my startup
            </Link>
            <button
              className={cn("menu-button")}
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Menu size={24} strokeWidth={2.4} />
            </button>
          </div>

          <motion.div
            className={cn("mobile-nav")}
            initial={false}
            animate={menuOpen ? "open" : "closed"}
            variants={{
              open: { opacity: 1, y: 0, pointerEvents: "auto" },
              closed: { opacity: 0, y: -8, pointerEvents: "none" }
            }}
          >
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </a>
            ))}
            <Link href={loginHref} onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
          </motion.div>
        </header>

        <div className={cn("side-scroll-assets")} aria-hidden="true">
          <span className={cn("side-asset side-asset-paper")} data-reveal>
            <Image
              src="/images/side-crumpled-paper-alpha.png"
              width={1254}
              height={1254}
              sizes="(min-width: 1101px) 26vw, 0px"
              alt=""
            />
          </span>
          <span className={cn("side-asset side-asset-bin")} data-reveal>
            <Image
              src="/images/side-trash-bin-alpha.png"
              width={1254}
              height={1254}
              sizes="(min-width: 1101px) 29vw, 0px"
              alt=""
            />
          </span>
        </div>

        <section className={cn("hero section-shell")}>
          <motion.div
            className={cn("paper-stage")}
            aria-label="Crumpled paper with crossed out bad startup names"
            initial={{ opacity: 0, y: 24, rotate: -1.8 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.72, ease: [0.2, 0.9, 0.2, 1] }}
          >
            <Image
              className={cn("paper-image")}
              src="/images/hero-paper-composite-cropped.png"
              width={950}
              height={1075}
              priority
              alt=""
            />
          </motion.div>

          <div className={cn("hero-copy")}>
            <motion.div
              className={cn("ai-pill")}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.45 }}
            >
              <Cpu size={17} strokeWidth={2.8} absoluteStrokeWidth />
              AI-Powered Startup Naming
            </motion.div>

            <div className={cn("headline-wrap")}>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.52, duration: 0.5 }}
              >
                Stop staring at{" "}
                <span className={cn("headline-annotation")}>
                  <span className={cn("target-text")}>“Untitled Startup”</span>
                  <motion.span
                    className={cn("annotation-highlight")}
                    initial={{ opacity: 0, scaleX: 0.94 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 2.12, duration: 0.22, ease: [0.2, 0.9, 0.2, 1] }}
                    aria-hidden="true"
                  />
                  <motion.span
                    className={cn("annotation-card")}
                    initial={{ opacity: 0, y: 12, scale: 0.56 }}
                    animate={{
                      opacity: [0, 1, 1, 1, 1],
                      y: [12, -5, 2, -1, 0],
                      scale: [0.56, 1.12, 0.94, 1.04, 1]
                    }}
                    transition={{
                      delay: 2.22,
                      duration: 0.52,
                      times: [0, 0.34, 0.56, 0.76, 1],
                      ease: [0.18, 0.95, 0.2, 1]
                    }}
                  >
                    <Image
                      className={cn("annotation-tooltip-image")}
                      src="/images/annotation-tooltip-user-alpha.png"
                      width={1120}
                      height={760}
                      alt=""
                    />
                  </motion.span>
                </span>
              </motion.h1>
              <motion.div
                className={cn("cursor-click")}
                aria-hidden="true"
                initial={{ opacity: 0, scale: 1.02, x: 150, y: 108, rotate: -12 }}
                animate={{
                  opacity: [0, 1, 1, 1, 0],
                  scale: [1.02, 0.84, 1.04, 1, 1],
                  x: 66,
                  y: 34,
                  rotate: -7
                }}
                transition={{
                  opacity: { delay: 1.35, duration: 1.34, times: [0, 0.12, 0.8, 0.94, 1] },
                  x: { delay: 1.35, duration: 0.64, ease: [0.18, 0.92, 0.2, 1] },
                  y: { delay: 1.35, duration: 0.64, ease: [0.18, 0.92, 0.2, 1] },
                  rotate: { delay: 1.35, duration: 0.64, ease: [0.18, 0.92, 0.2, 1] },
                  scale: {
                    delay: 2.02,
                    duration: 0.44,
                    times: [0, 0.28, 0.64, 1],
                    ease: [0.18, 0.95, 0.2, 1]
                  }
                }}
              >
                <Image
                  className={cn("cursor-image")}
                  src="/images/cursor-modern-reference-cropped-alpha.png"
                  width={753}
                  height={831}
                  alt=""
                />
              </motion.div>
            </div>

            <motion.p
              className={cn("hero-subhead")}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.45 }}
            >
              Name your startup for the price of a coffee.
            </motion.p>

            <motion.div
              className={cn("hero-cta")}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.82, duration: 0.45 }}
            >
              <Link className={cn("button button-primary hero-primary-cta")} href={signupHref}>
                Name my startup
                <ArrowRight size={19} strokeWidth={2.8} absoluteStrokeWidth />
              </Link>
              <p>First startup preview is free. No credit card required.</p>
            </motion.div>

            <div className={cn("results-stack")} aria-label="Generated name suggestions">
              {resultCards.map((card, index) => {
                const Icon = card.icon;

                return (
                  <motion.article
                    className={cn("name-card")}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: arrowPaths.toResults.headDelay - 0.03 + index * 0.08, duration: 0.32, ease: [0.2, 0.9, 0.2, 1] }}
                    key={card.name}
                  >
                    <div className={cn("name-icon", card.tone)} aria-hidden="true">
                      <Icon size={32} strokeWidth={3} absoluteStrokeWidth />
                    </div>
                    <div className={cn("name-copy")}>
                      <div>
                        <h2>{card.name}</h2>
                        <span className={cn("vibe-chip", card.tone)}>{card.vibe}</span>
                      </div>
                      <p>{card.description}</p>
                    </div>
                    <div className={cn("availability")}>
                      <CheckCircle2 size={18} strokeWidth={2.5} absoluteStrokeWidth />
                      <span>Domain signal</span>
                    </div>
                    <button className={cn("bookmark-button")} type="button" aria-label={`Save ${card.name}`}>
                      <Bookmark size={21} strokeWidth={2.3} absoluteStrokeWidth />
                    </button>
                  </motion.article>
                );
              })}
            </div>
          </div>

          <DottedArrow className={cn("to-headline")} />
          <DottedArrow className={cn("to-results")} />
        </section>

        <section className={cn("logo-strip section-shell")} aria-label="Naming quality signals">
          <div className={cn("logo-marquee-track")}>
            {logoMarqueeItems.map((logo, index) => (
              <span className={cn("logo-lockup")} aria-hidden={index >= logoStrip.length} key={`${logo.name}-${index}`}>
                <i className={cn("logo-mark", logo.mark)} aria-hidden="true" />
                {logo.name}
              </span>
            ))}
          </div>
        </section>

        <section className={cn("how-section section-shell")} id="how-it-works" data-reveal>
          <div className={cn("section-heading")}>
            <h2>From idea to name in 3 simple steps</h2>
          </div>

          <div className={cn("steps-grid")}>
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className={cn("step-card")} data-reveal style={{ "--step-index": index } as CSSProperties} key={step.title}>
                  <span className={cn("step-number")}>{step.number}</span>
                  <span className={cn("step-glyph")} aria-hidden="true">
                    <Icon size={52} strokeWidth={2.2} absoluteStrokeWidth />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className={cn("examples-section section-shell")} id="examples" data-reveal>
          <div className={cn("section-heading")}>
            <h2>Real ideas. Real shortlists.</h2>
            <p>See how rough startup ideas turn into launch-ready name options.</p>
          </div>

          <div className={cn("examples-table-wrap")}>
            <table className={cn("examples-table")}>
              <colgroup>
                <col className={cn("idea-col")} />
                <col className={cn("shortlist-col")} />
                <col className={cn("vibe-col")} />
                <col className={cn("availability-col")} />
                <col className={cn("save-col")} />
              </colgroup>
              <thead>
                <tr>
                  <th>Idea</th>
                  <th>Shortlist</th>
                  <th>Vibe</th>
                  <th>Signal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {examples.map((example, index) => (
                  <tr data-reveal style={{ "--row-index": index } as CSSProperties} key={example.idea}>
                    <td>
                      <strong>{example.idea}</strong>
                      <span className={cn("row-note")}>{example.note}</span>
                    </td>
                    <td>
                      <div className={cn("pill-list")}>
                        {example.shortlist.map((name) => (
                          <span key={name}>{name}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={cn("status-chip", example.vibe.toLowerCase())}>{example.vibe}</span>
                    </td>
                    <td>
                      <div className={cn("status-line")}>
                        <CheckCircle2 size={18} strokeWidth={2.5} absoluteStrokeWidth />
                        <span>{example.availability}</span>
                      </div>
                    </td>
                    <td>
                      <Bookmark size={20} strokeWidth={2.2} absoluteStrokeWidth />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={cn("examples-cards")}>
              {examples.map((example) => (
                <article className={cn("example-card-mobile")} key={example.idea}>
                  <strong>{example.idea}</strong>
                  <div className={cn("pill-list")}>
                    {example.shortlist.map((name) => (
                      <span key={name}>{name}</span>
                    ))}
                  </div>
                  <div className={cn("mobile-card-meta")}>
                    <span className={cn("status-chip", example.vibe.toLowerCase())}>{example.vibe}</span>
                    <span className={cn("status-line")}>
                      <CheckCircle2 size={18} strokeWidth={2.5} absoluteStrokeWidth />
                      {example.availability}
                    </span>
                  </div>
                  <p>{example.note}</p>
                </article>
              ))}
            </div>

            <a className={cn("examples-link")} href="#examples">
              View more examples
              <ArrowRight size={18} strokeWidth={2.7} absoluteStrokeWidth />
            </a>
          </div>
        </section>

        <section className={cn("pricing-section section-shell")} id="pricing" data-reveal>
          <div className={cn("section-heading")}>
            <h2>Simple pricing for serious names</h2>
            <p>Your first startup gets {PRODUCT_OFFER.freeNameCount} names free. Every startup after that uses a {PRODUCT_OFFER.paidPassPrice} pack for {PRODUCT_OFFER.paidNameCount} names plus checks.</p>
          </div>

          <div className={cn("pricing-grid")}>
            {plans.map((plan, index) => (
              <article
                className={cn("pricing-card", plan.featured && "is-featured")}
                data-reveal
                style={{ "--plan-index": index } as CSSProperties}
                key={plan.name}
              >
                {plan.featured ? <span className={cn("plan-badge")}>$5 one-time</span> : null}
                <h3>{plan.name}</h3>
                <div className={cn("price-line")}>
                  <span>{plan.price}</span>
                  {plan.cadence ? <small>{plan.cadence}</small> : null}
                </div>
                <p>{plan.description}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 size={18} strokeWidth={2.5} absoluteStrokeWidth />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link className={cn("button", plan.featured ? "button-primary" : "button-outline")} href={plan.href}>
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className={cn("final-cta section-shell")} data-reveal>
          <div className={cn("cta-mark")} aria-hidden="true">
            <Rocket size={84} strokeWidth={2.2} absoluteStrokeWidth />
          </div>
          <div>
            <h2>Ready to find the name you were meant to launch?</h2>
          </div>
          <div className={cn("final-cta-actions")}>
            <Link className={cn("button button-primary")} href={signupHref}>
              Name my startup
              <ArrowRight size={18} strokeWidth={2.7} absoluteStrokeWidth />
            </Link>
            <p>First startup preview is free. No credit card required.</p>
          </div>
        </section>

        <footer className={cn("site-footer section-shell")}>
          <Link href="/" aria-label="Namelift home">
            <Brand />
          </Link>
          <nav aria-label="Footer navigation">
            {footerLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <p>© 2026 Namelift. Operated by SpectraLabsHQ.</p>
        </footer>
      </main>
    </MotionConfig>
  );
}
