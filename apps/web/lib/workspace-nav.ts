export const workspaceNav = [
  { href: "/home", label: "Home" },
  { href: "/tests", label: "Assessments" },
  { href: "/games", label: "Brain Games" },
  { href: "/results", label: "Results" },
  { href: "/account", label: "My Profile" },
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
  { id: "personality", label: "Personality", slugs: [] },
  { id: "eq", label: "EQ", slugs: ["work-emotion-awareness"] },
];
