import { definitionsEqual } from "./equality";

export type StoredVersion = {
  id: string;
  status: string;
  definition: unknown;
};

export type VersionWrite = "insert" | "skip" | "update-draft";

export function planVersionWrite(
  stored: StoredVersion | undefined,
  incoming: { id: string; status: string; definition: unknown },
  slug: string,
): VersionWrite {
  if (!stored) {
    return "insert";
  }

  if (stored.status === "published") {
    if (incoming.status !== "published") {
      throw new Error(
        `Cannot unpublish ${slug} (${incoming.id}) from catalog files.`,
      );
    }
    if (!definitionsEqual(stored.definition, incoming.definition)) {
      throw new Error(
        `Published ${slug} (${incoming.id}) does not match the catalog file. Bump version and add a new version id; do not edit published JSON.`,
      );
    }
    return "skip";
  }

  return "update-draft";
}
