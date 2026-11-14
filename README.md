# Mandarin Mastery Hub

i want to improve my interface for a mandarin tutor (overview, vocabulary, strokes, references, settings)    . Check the screenshots of the existing

This project was built with [Lovable](https://lovable.dev).

## Data documentation

Start with [catalog.md](public/data/catalog.md) for the split glyph catalogue, JSON schemas, loading behavior, exact record identities, and importer migration instructions.

| Directory | Usage guide |
| --- | --- |
| `public/data/` | [Public JSON datasets and lazy sidecars](public/data/README.md) |
| `src/data/` | [Data imported through TypeScript](src/data/README.md) |
| `importer/data/` | [Importer-only source inputs](importer/data/README.md) |
| `reports/` | [Offline audits, reports, and notes](reports/README.md) |
| `scripts/` | [Importers and font builders](scripts/README.md) |

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0c46b9ee-9d06-49c0-b59e-9197ea6e6754).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
