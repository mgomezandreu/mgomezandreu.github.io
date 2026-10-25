// Single source of truth for publications, rendered as Field Notes entries on
// the home page in this order: newest work first, numbered from the bottom. The
// tactile hardness paper is last (no. 01) because Mario worked on it first; it
// just took longer to get accepted.
//
// Site-internal asset paths are wrapped in withBase() here so consumers get
// correct URLs under the configured `base`; external URLs pass through.
//
// Links start with "paper": the arXiv abstract page when there is one,
// otherwise the PDF. No separate arXiv or pdf links.

import type { SceneName } from "@lib/sketch/core";
import { withBase } from "@lib/utils";

export type PubLink = { label: string; href: string };

export type Publication = {
  id: string;           // anchor on the home page
  title: string;
  year: number;
  venue: string;
  award?: string;
  authors: string[];    // display form; "*" marks equal contribution
  me: number;           // index of Mario in `authors`, underlined
  links: PubLink[];
  headline: string;     // handwritten, plain-language version of the title
  deck: string;         // one-line summary; ==text== is highlighted
  sketch: SceneName;
};

export const publications: Publication[] = [
  {
    id: "pave",
    title: "Leave It Better Than Found: Value-Guided Cooperation in Sequential Tasks",
    year: 2026,
    venue: "CoRL",
    award: "Spotlight",
    authors: ["M. Gomez Andreu", "M. Amir", "A. Marino", "T. An", "M. Hutter", "A. Prorok"],
    me: 0,
    links: [
      { label: "paper", href: "https://proroklab.github.io/PAVE/website/static/pdfs/PAVE.pdf" },
      { label: "code", href: "https://github.com/proroklab/PAVE" },
      { label: "site", href: "https://proroklab.github.io/PAVE/website/" },
    ],
    headline: "two robots, one room, no joint training",
    deck: "The second robot shares its value function, so the first one can leave the room in a state that helps it. Up to ==47.7% higher task success==.",
    sketch: "pave",
  },
  {
    id: "foci",
    title: "FOCI: Trajectory Optimization on Gaussian Splats",
    year: 2025,
    venue: "IROS",
    authors: ["M. Gomez Andreu*", "M. Wilder-Smith*", "V. Klemm", "V. Patil", "J. Tordesillas", "M. Hutter"],
    me: 0,
    links: [
      { label: "paper", href: "https://arxiv.org/abs/2505.08510" },
      { label: "site", href: "https://rffr.leggedrobotics.com/works/foci/" },
    ],
    headline: "trajectory optimization directly on a Gaussian Splat",
    deck: "Collision cost from ==Gaussian overlap integrals==, computed directly on the 3D reconstruction, so a legged robot can plan through tight spaces.",
    sketch: "foci",
  },
  {
    id: "robowrangler",
    title: "RoboWrangler: Toward Rope-based Grasping for Mobile Manipulation",
    year: 2025,
    venue: "RoboSoft",
    authors: ["C. Friedrich", "M. Gomez Andreu", "G. Métois", "F. Shi", "M. Hutter", "R. Baines"],
    me: 1,
    links: [
      { label: "paper", href: withBase("/files/RoboWrangler.pdf") },
      { label: "code", href: "https://github.com/leggedrobotics/robowrangler" },
    ],
    headline: "a gripper made of rope",
    deck: "A lasso-like ==loop of rope== on a robot's end-effector that catches and pulls in objects, demonstrated on a quadruped.",
    sketch: "lasso",
  },
  {
    id: "cascade",
    title: "Beyond the Cascade: Juggling Vanilla Siteswap Patterns",
    year: 2024,
    venue: "IROS",
    authors: ["M. Gomez Andreu", "K. Ploeger", "J. Peters"],
    me: 0,
    links: [
      { label: "paper", href: "https://arxiv.org/abs/2410.19591" },
      { label: "video", href: "https://www.youtube.com/watch?v=fqGm-cLNWFI" },
      { label: "site", href: "https://kai-ploeger.com/beyond-cascades" },
    ],
    headline: "a robot juggling more than the basic pattern",
    deck: "Constraint-based planning that juggles ==any vanilla siteswap== with throws up to nine beats high, and switches smoothly between patterns.",
    sketch: "juggle",
  },
  {
    id: "hardness",
    title: "Investigating Active Sampling for Hardness Classification with Vision-Based Tactile Sensors",
    year: 2026,
    venue: "Humanoids",
    authors: ["J. Chen", "A. Kshirsagar", "F. Heller", "M. Gomez Andreu", "B. Belousov", "T. Schneider", "L. P. Y. Lin", "K. Doerschner", "K. Drewing", "J. Peters"],
    me: 3,
    links: [
      { label: "paper", href: "https://arxiv.org/abs/2505.13231" },
    ],
    headline: "pressing objects to tell how hard they are",
    deck: "A robot with a tactile sensor tells objects apart by hardness at ==88.78% accuracy==, compared to 48% for people.",
    sketch: "touch",
  },
];
