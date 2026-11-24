# Local lesson tools

The 20 canonical Project Source files and [README](README.md) come byte-for-byte
from the supplied Core v3.6.1 ZIP. See the [import audit](../../../../reports/lessons-3.6.1-import.json).
Topic/general schemas accept format 3.4.0; the character schema adds the optional
third pattern line without changing its 3.2.0 format version. Existing lessons
remain accepted. `validate_core.py` applies its teaching-plan semantic guards
and report-field checks to the new formats; these guards are not bypassed.
`.gitattributes` preserves canonical source bytes across checkouts.

The following tools are maintained separately; changing them does not change the
Core schema version:

| File | Purpose / consumer |
| --- | --- |
| `validate_core.py` | JSON Schema, quiz identities, exact catalog references, curriculum membership and parent/subtopic checks. Applies the existing teaching-plan rules to topic schemas v3.1–v3.4; with checkpoints (v3.3) the 4+ applied questions are those whose practice checkpoint is required, otherwise comprehension/production questions. Requires `jsonschema`. |
| `generate_lesson.py` | Generates HTML/Markdown and optional four-file ZIPs from canonical JSON. Topic v3.2 uses the same teaching-plan renderer as v3.1. Supplied lesson companions are imported without regeneration. |
| `legacy/` | Earlier schema snapshots retained for reference; not application data. |

From the repository root:

```sh
python src/data/study_lessons/core/validate_core.py --self-test
python scripts/import-lessons-v3.6.1.test.py
```

See the [source handoff guide](../../../../importer/data/lessons/README.md) for
import commands and the [study lesson guide](../README.md) for application loading.
