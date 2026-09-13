import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertUniqueCatalog,
  type CatalogDocument,
  parseCatalogDocument,
} from "./document";

export function catalogInstrumentsDir() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "instruments");
}

export function loadCatalogDocuments(
  directory = catalogInstrumentsDir(),
): CatalogDocument[] {
  const names = readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort();

  const documents = names.map((name) => {
    const path = join(directory, name);
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return parseCatalogDocument(raw, name);
  });

  assertUniqueCatalog(documents);
  return documents;
}
