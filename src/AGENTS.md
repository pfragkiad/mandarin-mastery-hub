# src notes

- The handwritten hanzi web-font fallback in styles.css must cover both Simplified and Traditional code points, so phones without a system Kai font never mix styles between script forms.
- Words/Phrases hanzi come first from two small self-hosted subsets ('Tutor Vocabulary Kai'/'Tutor Vocabulary Serif', built by scripts/build-vocabulary-fonts.py from the same web-font designs) so phones draw a whole word in the chosen style instead of slice-by-slice fallbacks; rebuild them when the vocabulary gains characters (vocabulary-fonts.test.ts fails). The root shell applies the saved style before first paint for the same reason.
