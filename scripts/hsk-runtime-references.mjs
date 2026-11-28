/** Keep historical HSK serials in offline handoffs, outside browser vocabulary.
 * Corpus sentence IDs and dictionary attribution are independent identities.
 */
const handoff = /^hsk3_level[1-6]_\d+\.\d+\.\d+\.json$/;
const spreadsheet = /^HSK3_Level[1-6]_.*\.xlsx$/;

export function currentHskRuntimeEntry(entry) {
  if (entry.hskVersion !== '3.0' || entry.hsk_index == null) return entry;
  const result = { ...entry };
  if (entry.studyMetadata) {
    const { numberingRevision, ...metadata } = entry.studyMetadata;
    result.studyMetadata = metadata;
  }
  if (entry.secondarySources) result.secondarySources = entry.secondarySources.filter(source =>
    (!handoff.test(source.sourceName) && !spreadsheet.test(source.sourceName)) ||
    source.sourceName === entry.studyMetadata?.source.sourceName);
  result.examples = entry.examples.map(example => {
    const next = { ...example };
    if (example.sourceReference && handoff.test(example.sourceReference.handoff ?? '')) {
      // Retain the exact source filename/checksum and its attribution, without
      // claiming that its historical record number is a current syllabus ID.
      const { entry_id, ...reference } = example.sourceReference;
      next.sourceReference = reference;
    }
    if (example.revision) {
      const { baseline_id, ...revision } = example.revision;
      next.revision = revision;
    }
    return next;
  });
  return result;
}
