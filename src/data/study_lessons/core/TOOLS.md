# Local lesson tools

The 19 canonical Project Source files and [README](README.md) come byte-for-byte
from the owner's v3.2.0 Core ZIP. Their hashes are recorded in
[the core import audit](../../../../reports/lesson-core-3.2.0-import.json).
`.gitattributes` preserves their exact bytes across checkouts.

The following tools are maintained separately; changing them does not change the
Core schema version:

| File | Purpose / consumer |
| --- | --- |
| `validate_core.py` | JSON Schema, quiz identities, exact catalog references, curriculum membership and parent/subtopic checks. Applies the existing teaching-plan rules to topic schemas v3.1/v3.2. Requires `jsonschema`. |
| `generate_lesson.py` | Generates HTML/Markdown and optional four-file ZIPs from canonical JSON. Topic v3.2 uses the same teaching-plan renderer as v3.1. Supplied lesson companions are imported without regeneration. |
| `legacy/` | Earlier schema snapshots retained for reference; not application data. |

From the repository root:

```sh
python src/data/study_lessons/core/validate_core.py --self-test
python scripts/import-hsk-level1-lessons.test.py
```

See the [source handoff guide](../../../../importer/data/lessons/README.md) for
import commands and the [study lesson guide](../README.md) for application loading.
