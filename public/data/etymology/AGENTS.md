# Etymology handoff instructions

- Read [README.md](README.md) before frontend integration. It is the contract for
  exact-record lookup, status handling, source text and BabelStone evidence.
- This is a complementary static dataset. Do not add a hosted database, modify
  existing catalogue/section JSON, replace record IDs or mutate existing IDS,
  radical-family/contextual identities, pronunciation or stroke bindings.
- Generate with `python scripts/import-etymology.py --write`; verify with `--check`
  and `python scripts/import-etymology.test.py`. Generated index/shards/audit must
  not be manually patched. Preserved upstream sources stay in importer/data.
- Use current `libraryEntries`, `radicalVariantEntry` and contextual-identity
  adapters for identities. Family-qualified lookup takes precedence over heading
  IDs; retain every exact family/form identity, even for identical glyphs/IDs.
- `exact-headword` is source coverage for a Characters record, not scholarly
  approval. Components/radicals require context review; blocked candidates never
  become definitions. Keep unreviewed/absent states explicit and preserve multiple
  source entries and duplicate Shuowen IDs.
- Written-form suggestions do not authorize inherited explanations. In particular,
  发 never automatically receives 發 or 髮 text, and the jade 王-shaped variant
  never receives the standalone 王 explanation.
- BabelStone references describe graphical membership only. Keep raw tokens,
  regional qualifiers, occurrence paths and tree checksum checks. Numbered/PUA
  forms retain source identities; descriptions/substitutions are not lexical IDs.
  No geometry is checked/exported here; use the existing independent validators.
- Fetch the index and selected shards lazily through one shared browser-safe
  adapter, outside catalogue/page bundles. Check schema/version, exact identities
  and recorded shard response-byte SHA-256. Do not create a competing decomposition
  renderer or render source text as executable HTML.
- Keep root dataset metadata and all full source-specific notices in every
  redistributed JSON. Packaging version, schema version and upstream commit are
  distinct; import date remains the actual acquisition date.
- Normalize the repository-authored structural notice to LF when embedding it,
  consistently with its input fingerprint. Preserve downloaded upstream license
  bytes. The LF/CRLF exporter regression test must pass on either checkout;
  never silence the check by ignoring arbitrary differences in generated JSON.
- Update this guide, its schema and [the source guide](../../../importer/data/etymology/README.md)
  together when changing the data contract. Editorial review requires explicit,
  provenance-attached evidence; never infer verification from two-source presence.
