import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { S } from '../state/scene'
import { useUI } from '../state/store'
import { holdAt, T, worldAt } from '../state/timeline'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

let trigger: ScrollTrigger | null = null

/** Smoothly scroll the page so the timeline lands on time `t`. */
export function scrollToTime(t: number) {
  if (!trigger) return
  const y = trigger.start + (t / T.TOTAL) * (trigger.end - trigger.start)
  gsap.to(window, {
    scrollTo: { y, autoKill: true },
    duration: S.reduced ? 0 : Math.min(2.4, 0.9 + Math.abs(window.scrollY - y) / 4000),
    ease: 'power3.inOut',
  })
}

/**
 * Builds the master timeline: one proxy value (`t`) drives every 3D world,
 * and the same timeline choreographs the HTML copy layers.
 */
export function buildDirector(root: HTMLElement, spacer: HTMLElement) {
  const ctx = gsap.context(() => {
    const proxy = { t: 0 }
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: spacer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: S.reduced ? true : 0.9,
        invalidateOnRefresh: true,
      },
      onUpdate: () => {
        S.t = proxy.t
        useUI.getState().setWorld(worldAt(S.t), holdAt(S.t))
      },
    })
    trigger = tl.scrollTrigger ?? null
    tl.to(proxy, { t: T.TOTAL, duration: T.TOTAL }, 0)

    const q = gsap.utils.selector(root)
    const show = (sel: string, at: number, from: gsap.TweenVars = { y: 36 }, dur = 0.32) => {
      // staggered fromTo only pre-renders its first target, so set the hidden state explicitly
      gsap.set(q(sel), { autoAlpha: 0, ...from })
      return tl.fromTo(
        q(sel),
        { autoAlpha: 0, ...from },
        { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: dur, ease: 'power2.out', stagger: 0.035, immediateRender: false },
        at,
      )
    }
    const hide = (sel: string, at: number, to: gsap.TweenVars = { y: -36 }, dur = 0.28) =>
      tl.to(q(sel), { autoAlpha: 0, ...to, duration: dur, ease: 'power2.in', stagger: 0.02 }, at)

    // ── World 1: AI Studio ──
    hide('.scroll-hint', 0.05, { y: 10 }, 0.15)
    hide('.ai-hero .rise', 0.42, { y: -50 })
    show('.ai-steps', 0.3)
    hide('.ai-steps', 1.85)
    show('.ai-panel .rise', 1.9, { y: 40 })
    show('.ai-drag-hint', 2.0, { y: 12 })
    hide('.ai-panel .rise, .ai-drag-hint', 2.92)

    // ── World 2: 3D Studio ──
    show('.st-head .rise', 3.7, { x: 50, y: 0 })
    show('.st-tools', 5.4, { y: 50 })
    hide('.st-head .rise, .st-tools', 6.55)

    // ── World 3: Marketplace ──
    show('.mk-head .rise', 7.35, { y: 40 })
    show('.mk-panel', 8.6, { y: 40 })
    show('.mk-sticker', 8.55, { scale: 0.4, y: 0 })
    hide('.mk-head .rise, .mk-panel, .mk-sticker', 9.75)

    // ── World 4: Order Print ──
    show('.pr-head .rise', 10.55, { y: 40 })
    show('.pr-status', 11.2, { y: 16 })
    hide('.pr-status', 12.85, { y: -16 })
    hide('.pr-ctas', 13.05, { y: -20 })
    show('.pr-panel', 13.15, { y: 40 })
    hide('.pr-head .rise, .pr-panel', 14.25)

    // ── Finale ──
    show('.fin-head .rise', 14.8, { y: 40 })
    show('.fin-footer', 15.25, { y: 30 })

    // keep the timeline exactly TOTAL long
    tl.set({}, {}, T.TOTAL)
  }, root)

  return () => {
    ctx.revert()
    trigger = null
  }
}
