import type { Site, Metadata, Socials } from "@types";

export const SITE: Site = {
  NAME: "Mario Gomez Andreu",
  EMAIL: "margomez@ethz.ch",
  NUM_NOTES_ON_HOMEPAGE: 3,
};

// Whether notes and projects are shown: only when PUBLISH_WRITEUPS is set in
// astro.config.mjs, or locally with `npm run dev:writeups`.
export const WRITEUPS: boolean = __WRITEUPS__;

export const HOME: Metadata = {
  TITLE: "Home",
  DESCRIPTION:
    "Mario Gomez Andreu - robotics researcher working on planning and control for robots that interact with the physical world. PhD student at ETH Zürich and the Max Planck Institute for Intelligent Systems.",
};

export const NOTES: Metadata = {
  TITLE: "Notes",
  DESCRIPTION: "Notes and write-ups on robotics, optimization and things I am learning.",
};

export const CV: Metadata = {
  TITLE: "CV",
  DESCRIPTION: "Curriculum vitae of Mario Gomez Andreu.",
};

export const SOCIALS: Socials = [
  {
    NAME: "github",
    HREF: "https://github.com/mgomezandreu",
  },
  {
    NAME: "scholar",
    HREF: "https://scholar.google.com/citations?user=Dqd2NBMAAAAJ",
  },
  {
    NAME: "linkedin",
    HREF: "https://www.linkedin.com/in/mario-gomez-andreu-b12651202/",
  },
  {
    NAME: "x",
    HREF: "https://x.com/mgomezandreu",
  },
];
