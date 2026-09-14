import { FIVE_FACTOR_SLUG } from "./personality";

export const workspaceNav = [
  { href: "/home", label: "Home" },
  { href: "/tests", label: "Assessments", shortLabel: "Tests" },
  { href: "/battery", label: "Battery" },
  { href: "/personality", label: "Personality", shortLabel: "Traits" },
  { href: "/games", label: "Brain Games", shortLabel: "Games" },
  { href: "/results", label: "Results" },
  { href: "/account", label: "My Profile", shortLabel: "Profile" },
] as const;

export const profileBuckets: Array<{
  id: string;
  label: string;
  slugs: string[];
}> = [
  {
    id: "cognitive",
    label: "Cognitive",
    slugs: ["quick-pattern-reasoning"],
  },
  { id: "memory", label: "Memory", slugs: [] },
  { id: "attention", label: "Attention", slugs: ["work-attention"] },
  { id: "personality", label: "Personality", slugs: [FIVE_FACTOR_SLUG] },
  { id: "eq", label: "EQ", slugs: ["work-emotion-awareness"] },
];
