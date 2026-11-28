# Preserved source notices

The four supplied source files remain byte-identical to the second-round archive:

- `cmn-caen-tan-index.xml.bz2`: compressed Shtooka index used by the second-round importer to confirm exact word/reading tags.
- `cmn-caen-tan-readme.txt`: original source attribution and license notice.
- `cmn-balm-hsk1-index.xml`: original index for alternative package candidates; not used to approve second-round attachments.
- `cmn-balm-hsk1-readme.txt`: original source attribution and license notice.

No generators rewrite these files. `scripts/import-missing-audio-v2.py --package` compares them against the external archive extraction. See the [package guide](../README.md) for review boundaries, CDN pointers and report.