#!/usr/bin/env node
/** Read-only bridge to the application's exact identities and BabelStone parser.
 * The Python importer consumes this temporary snapshot. No catalogue, source tree,
 * regional qualifier, numbered token or geometry is rewritten here.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

if (process.argv.length !== 3)
  throw new Error("Usage: node scripts/export-etymology-context.mjs <snapshot.json>");
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root));
// Repository-authored text follows checkout line endings. Canonicalize both its
// embedded presentation and input fingerprint; checksum-bound upstream notices
// are handled separately by the source downloader and retain their raw bytes.
const repositoryText = (path) => read(path).toString("utf8").replaceAll("\r\n", "\n");
const json = (path) => JSON.parse(read(path).toString("utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const jiti = createJiti(import.meta.url, {
  alias: { "@": fileURLToPath(new URL("src/", root)) },
  fsCache: false,
});
const { hydrateCatalog, catalog } = await jiti.import(
  fileURLToPath(new URL("src/lib/catalog-store.ts", root)),
);
const { libraryEntries, radicalVariantEntry } = await jiti.import(
  fileURLToPath(new URL("src/lib/character-library.ts", root)),
);
const { contextualVariantIdentity } = await jiti.import(
  fileURLToPath(new URL("src/lib/radical-contextual-identity.ts", root)),
);
const { gSourceDecompositions, treeEncoding } = await jiti.import(
  fileURLToPath(new URL("src/lib/character-enrichment.ts", root)),
);
const metadata = json("public/data/catalog.json");
if (metadata.version !== 2) throw new Error("Unsupported catalogue version");
hydrateCatalog(
  {
    ...metadata,
    ...json("public/data/characters.json"),
    ...json("public/data/components.json"),
    ...json("public/data/radicals.json"),
  },
  json("public/data/radical-identities.json"),
  json("public/data/radical-strokes.json"),
  json("public/data/strokes.json"),
);

const records = ["Characters", "Components", "Radicals"].flatMap((kind) =>
  libraryEntries(kind).map((entry) => ({
    id: entry.id,
    kind,
    glyph: entry.hanzi,
    ...(entry.kangxiIndex ? { familyId: entry.kangxiIndex } : {}),
  })),
);
if (new Set(records.map((record) => record.id)).size !== records.length)
  throw new Error("Duplicate catalogue identity");
const forms = libraryEntries("Radicals").flatMap((heading) => {
  const family = catalog.radicalStrokes.families.find((item) => item.id === heading.kangxiIndex);
  if (!family) throw new Error(`Missing radical family: ${heading.id}`);
  return family.forms.map((form) => {
    const contextual = contextualVariantIdentity(family.id, form.key, form.character);
    return {
      id: radicalVariantEntry(heading, form).id,
      headingId: heading.id,
      familyId: family.id,
      formKey: form.key,
      glyph: form.character,
      contextualIdentity: contextual
        ? {
            parentRadical: contextual.parentRadical,
            lookAlikeGlyph: contextual.lookAlike?.glyph ?? null,
          }
        : null,
    };
  });
});

function occurrences(node, path = []) {
  return node.children?.length
    ? node.children.flatMap((child, index) => occurrences(child, [...path, index]))
    : [{ token: node.glyph, path }];
}
const enrichmentManifest = json("public/data/character-enrichment/manifest.json");
const definitions = json("src/data/babelstone-components.json");
if (definitions.sha256 !== enrichmentManifest.sources.babelstone.sha256)
  throw new Error("BabelStone source versions disagree");
const babelstone = [];
for (const file of readdirSync(new URL("public/data/character-enrichment/", root))
  .filter((file) => /^[a-f0-9]+\.json$/.test(file))
  .sort()) {
  const bytes = read(`public/data/character-enrichment/${file}`);
  const envelope = JSON.parse(bytes.toString("utf8"));
  const glyph = String.fromCodePoint(Number.parseInt(file.slice(0, -5), 16));
  if (
    envelope.format !== "mandarin-character-enrichment" ||
    envelope.schemaVersion !== 1 ||
    envelope.character !== glyph ||
    envelope.reviewStatus !== "unreviewed-source-annotations"
  )
    throw new Error(`Invalid structural envelope: ${file}`);
  const record = envelope.record;
  // Exact current-tree binding only. This audit never loads or verifies geometry,
  // and consequently exports no occurrence-to-stroke mappings or outlines.
  const currentTreeChecksum = digest(
    Buffer.from(`${JSON.stringify(treeEncoding(catalog.trees[glyph]))}\n`, "utf8"),
  );
  const treeCurrent = currentTreeChecksum === record.bindings.treeChecksum;
  const alternatives = treeCurrent
    ? gSourceDecompositions(record).map((alternative) => ({
        expression: alternative.expression,
        qualifiers: alternative.qualifiers,
        parseStatus: alternative.tree ? "parsed" : "unsupported",
        occurrences: alternative.tree ? occurrences(alternative.tree) : [],
      }))
    : [];
  babelstone.push({
    glyph,
    sidecar: `public/data/character-enrichment/${file}`,
    sidecarCanonicalSha256: digest(Buffer.from(JSON.stringify(envelope), "utf8")),
    currentTreeChecksum,
    recordedTreeChecksum: record.bindings.treeChecksum,
    status: treeCurrent ? (alternatives.length ? "current" : "no-direct-G") : "stale-tree-binding",
    alternatives,
  });
}
const paths = [
  "public/data/catalog.json",
  "public/data/characters.json",
  "public/data/components.json",
  "public/data/radicals.json",
  "public/data/strokes.json",
  "public/data/radical-identities.json",
  "public/data/radical-strokes.json",
  "public/data/character-variants-v1.4.0.json",
  "public/data/character-enrichment/manifest.json",
  "public/data/character-enrichment/THIRD_PARTY_NOTICES.md",
  "src/data/babelstone-components.json",
  "src/data/radical-contextual-identities.json",
  "src/lib/character-library.ts",
  "src/lib/catalog-store.ts",
  "src/lib/glyph-presentation.ts",
  "src/lib/radical-strokes.ts",
  "src/lib/radical-contextual-identity.ts",
  "src/lib/character-enrichment.ts",
  "src/lib/ids-tree.ts",
  "scripts/export-etymology-context.mjs",
];
writeFileSync(
  process.argv[2],
  `${JSON.stringify({
    records,
    forms,
    babelstone,
    variants: json("public/data/character-variants-v1.4.0.json"),
    structuralSource: {
      ...enrichmentManifest.sources.babelstone,
      notice: repositoryText("public/data/character-enrichment/THIRD_PARTY_NOTICES.md"),
    },
    inputs: Object.fromEntries(
      paths.map((path) => [path, digest(Buffer.from(repositoryText(path), "utf8"))]),
    ),
  })}\n`,
  "utf8",
);
console.log(
  `Exported ${records.length} exact catalogue records, ${forms.length} radical forms and ${babelstone.length} structural envelopes.`,
);
