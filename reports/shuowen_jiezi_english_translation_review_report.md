# *Shuowen Jiezi* English Draft — Translation Review Report

**Source file:** `shuowen-english-review.txt`  
**Scope:** 9,833 entries (`shuowen:1` – `shuowen:9833`), including 915 `[UNCERTAIN]`-flagged entries  

---

## 1. Executive Summary

Overall, the AI-generated draft is **philologically disciplined and surprisingly accurate** for a first-pass translation of *Shuowen Jiezi*. It consistently respects Xu Shen’s Han-era *liushu* (六書) graphical analyses rather than substituting modern paleography, renders classical quotations cleanly in most cases, and uses the `[UNCERTAIN]` flag appropriately for genuinely obscure or textually corrupt glosses.

However, a full-corpus audit reveals **five major categories of issues** that should be addressed before publication or downstream use:

1. **Multi-batch style and formatting drift:** At least six distinct stylistic regimes appear across the 9,833 entries, affecting structural formulas, quotation marks, measurement units, official titles, and romanization.
2. **Concrete philological and translation errors:** Specific mistranslations of classical quotations, institutional terms, and *Shuowen* glosses (documented in Section 3 with exact keys and recommended revisions).
3. **Source-text corruptions passed through or misread:** The underlying digital Chinese text contains numerous OCR/encoding corruptions (including simplified chemical-element characters such as `钉`, `钋`, `钍`, `钐`, `钕`, `钇`, `钙`, `钌`, as well as `借` for `皆`, `轂` for `穀`, `紅` for `甲`, `罰書` for `周書`). Some were caught by the draft, while others were silently translated literally.
4. **Resolvable `[UNCERTAIN]` flags:** Many flagged passages can be confidently resolved via Duan Yucai’s *Shuowen Jiezi zhu* (段玉裁《說文解字注》) and the standard *Shijing* / *Zhouli* / *Zuozhuan* / *Guoyu* parallels.
5. **Typography and export-escape artifacts:** Full-width Chinese question marks (`？`), literal escaped pipes (`\|`) representing the vertical stroke `丨`, and misconverted punctuation (`?` → `!`).

---

## 2. Systemic & Corpus-Wide Consistency Issues

### 2.1 Batch-Boundary Formula Drift

The translation phrasing shifts abruptly at fixed entry boundaries, indicating separate generation passes with different style templates:

| Entry Range | Phonetic Formula | Radical-Group Formula | Pronunciation Formula | Alternative Gloss | Quote Style |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `shuowen:1` – `2200` | `Formed from X, with Y indicating the sound.` | `All characters in the X category are formed from X.` | `Pronounced like X.` | `Another explanation:` | `“...”` |
| `shuowen:2201` – `3300` | `From X; Y supplies the sound.` | `All graphs in this category contain X.` | `Pronounced like X.` | `Another explanation:` | `“...”` |
| `shuowen:3301` – `6201` | `Formed from X, with Y indicating the sound.` | `All characters in this group follow X.` | `Read like X.` | `Another explanation:` | `“...”` |
| `shuowen:6202` – `6700` | `Formed from X, with Y indicating the sound.` | `All characters in this group are formed from X.` | `Read like X.` | `Alternatively,` | `'...'` |
| `shuowen:6701` – `7300` | `From X, with Y as phonetic.` | `All characters in this group are formed from X.` | `Read like X.` | `Alternatively,` | `'...'` |
| `shuowen:7301` – `9833` | `Formed from X, with Y indicating the sound.` | `All characters in this group are formed from X.` | `Read like X.` | `Alternatively,` | `'...'` |

**Recommendation:** Pick one house style across all 9,833 entries (e.g., `"Formed from X, with Y indicating the sound."`, `"All characters in the X group are formed from X."`, `"Read like X."`, `"Alternatively,"`, and standard double quotation marks `“...”`).

### 2.2 Units of Measurement & Institutional Titles

- **Length units (`尺`, `寸`):** Entries `1`–`3300` translate `尺`/`寸` as `"foot/feet"` and `"inch/inches"` (e.g., `shuowen:110`, `117`, `119`, `437`, `1460`), whereas `3301`–`9833` use romanized `"chi"` and `"cun"` (e.g., `shuowen:3368`, `4931`, `6142`, `8951`). **Recommendation:** Standardize on *chi* and *cun* (Han *chi* ≈ 23.1 cm, not an English foot).
- **Social/official ranks:**
  - `大夫` alternates between `"grandees"` (`39`, `437`, `1948`, `2266`, `2525`, `2794`), `"grand officers"` (`3499`, `3988`, `4784`, `5429`, `6030`), and `"great officers"` (`8951`, `9026`).
  - `士` alternates between `"scholars"` (`193`, `437`, `2266`, `3000`), `"officers"` (`3499`, `4904`, `5429`), and `"gentlemen"` (`8951`).
  - `賈侍中` alternates between `"Palace Attendant Jia"` (`771`, `1090`, `1192`, `1365`, `1675`) and `"Attendant Jia"` (`3578`, `3875`, `4306`, `5676`, `5754`, `6105`).
- **Classical titles:**
  - `《春秋傳》` alternates between `"The Spring and Autumn commentary"` and `"The Spring and Autumn Commentary"`.
  - `《明堂月令》` alternates between `"The Bright Hall Monthly Ordinances"` and `"The Bright Hall's Monthly Ordinances"`.

### 2.3 Unromanized Place Names & Rivers in the Second Half

Entries `1`–`6201` generally romanize geographic names (e.g., *Runan*, *Nanyang*, *Julu*, *Henei*). Starting around `shuowen:6288`—and pervasively throughout the Water radical (`shuowen:6948`–`7434`)—place names and major rivers are left as raw Chinese characters mixed inconsistently with romanized names:

- `shuowen:6288`: `"In 新亭, 南陽"` (vs. `"Nanyang"` earlier)
- `shuowen:6298`: `"in 代 commandery"`
- `shuowen:6950`–`7075`: `"beyond the frontier of 焞煌"`, `"entering the 河"`, `"flowing southeast into the 江"`, `"in 房陵, Hanzhong"`, `"in 盧氏, 弘農"`, `"in 舞陽, 南陽"`, `"in 零陵"`

**Recommendation:** Adopt a uniform geographic policy—either romanize all known place/river names (with optional Chinese in parentheses on first/ambiguous occurrence, e.g., `the Yellow River (河)`, `the Yangtze (江)`) or consistently retain Chinese alongside pinyin.

### 2.4 Punctuation & Escaping Artifacts

- **Full-width Chinese question marks (`？`) inside English text:** Found in `shuowen:283`, `504`, `650`, `757`, `1195`, `1763`, `2031`, `2221`, `2498`, `3031` (e.g., `shuowen:283`: `“Where can I find 藼 grass？”`). Replace with ASCII `?`.
- **Question marks converted to exclamation marks:**
  - `shuowen:7311`: Chinese `汝安能浼我？` → Draft `'How could you soil me!'` (should end with `?`).
  - `shuowen:8664`: Chinese `可以稱旌緐乎？` → Draft `'Can it be called a banner and mane ornament!'` (should end with `?`).
- **Escaped pipe `\|` carried into English prose:** In `shuowen:81` (`\| is their string.`), `shuowen:709` (`Formed from 入, \| and 八`), `shuowen:1459` (`\| represents south and north`), and `shuowen:3314` (`with \| depicting height`), the source used ASCII `|` (escaped as `\|` in this export) to represent the vertical-stroke graph `丨` (U+4E28). Replace with `丨`.
- **Stray escaped tab `\t` in source:** `shuowen:9459` (`CHINESE: 矛 — \t酋矛也。`).

---

## 3. Concrete Mistranslations & Philological Errors

The following entries contain substantive translation errors, misidentified historical titles/names, or misconstrued classical quotations.

| Key | Headword | Chinese Excerpt | Current English Draft | Issue & Recommended Revision |
| :--- | :--- | :--- | :--- | :--- |
| `shuowen:134` | 璪 | 《虞書》曰：“璪火黺米。” | The Book of Yu says: “Aquatic plants, fire and grains of rice.” | `黺米` (*fěnmǐ*, white rice / powdered-rice emblem) loses the `黺` motif when flattened to "grains of rice." Suggest: `“Aquatic plants, fire, and white-rice emblems (黺米).”` |
| `shuowen:1785` | 靬 | 武威有麗靬縣。 | Wuwei has Lijian county. | Standard historical pronunciation of `麗靬` (also `驪靬`) is **Liqian** (*Líqián*). |
| `shuowen:2104` | 睔 | 《春秋傳》有鄭伯睔。 | The Spring and Autumn commentary has Duke Gun of Zheng. | `鄭伯` is **Earl of Zheng**, not Duke (cf. `shuowen:9637`, which correctly uses `earl of Zheng`). |
| `shuowen:2326` | 羜 | 五月生羔也。 | A five-month-old lamb. | Means a lamb **born in the fifth month** (not five months old). Same error in `shuowen:2327` (𦎦: `六月生羔也` → **a lamb born in the sixth month**). |
| `shuowen:2814` | 耡 | 商人七十而耡。耡，耤稅也。 | The Shang assessed seven in seventy under the 耡 system; 耡 is a labor-service levy. | **Mistranslation.** From *Mencius* 3A.3 (`殷人七十而助`): under the Shang, each household received **70 *mu*** and paid the *zhu* (assistance/labor-service) tax—not "seven in seventy." |
| `shuowen:3231` | 餀 | 食臭也。 | The odor of food. | `食臭` here specifically means **spoiled/rancid food** (food that has developed a bad odor; cf. *Erya* `飯殠謂之餀`). |
| `shuowen:3613` | 榰 | 《易》：“榰恒凶。” | The Changes says: “Persisting in deep-rooted constancy brings misfortune.” | In *Yijing* (Hexagram 32, top six: `振恆凶`), `榰` is a variant for `振` (**agitated/restless constancy**), not "deep-rooted constancy." |
| `shuowen:4013` | 郃 | 左馮翊郃陽縣。 | Heyang County, 郃陽, in Left Pingyi. | **Misromanization.** `馮翊` is **Féngyì** (Left Fengyi), not *Pingyi*. Same error in `shuowen:4016`, `4017`, `4018`, `4019`, `5829`, `5868`. |
| `shuowen:4052` | 鄗 | 丗祖所卽位，今爲高邑。 | where the Founding Ancestor took the throne; now called Gaoyi. | `世祖` (*Shizu*) is **Emperor Guangwu of Han** (restorer of Eastern Han), not "the Founding Ancestor" (*Gaozu* / *Taizu*). Suggest: `where Emperor Shizu (Guangwu) ascended the throne`. |
| `shuowen:4088` | 䣕 | 存䣕，犍爲縣。 | 存䣕, a county in Qianwei. | **Misromanization.** `犍為` is traditionally pronounced **Jiānwéi**, not *Qianwei*. Same error in `shuowen:5165` (僰). |
| `shuowen:4970` | 侗 | 《詩》曰：“神罔時侗。” | The Odes says: “The spirit is not so unknowing.” | **Mistranslation.** In *Shijing* (Mao 240, `神罔時恫`), `侗` = `恫` ("grieved/pained"): `“The spirits had no cause to be grieved by him.”` |
| `shuowen:6385` | 燬 | 《春秋傳》曰：“衞矦燬。” | The Spring and Autumn Commentary says: 'Duke Hui of Wei.' | `衞矦` is **Marquis Hui of Wei** (`侯` = marquis), not Duke. |
| `shuowen:7405` | 漕 | 水轉轂也。 | To transport by water, as by turning a cart's hub. | `轂` is a source typo for **`穀`** (grain). Standard *Shuowen* (`水轉穀也`) means **“to transport grain by water.”** |
| `shuowen:7663` | 𠃉 | 凡𠃉之屬借从𠃉。 | All characters in this group borrow 𠃉 as their component. | `借` is a source typo for **`皆`** ("all"). Should read: `All characters in this group are formed from 𠃉.` |
| `shuowen:7891` | 摽 | 一曰挈門壯也。 | Alternatively, a door-lifting strongman, apparently; the phrase 挈門壯 is uncertain. | **Mistranslation.** `門壯` is a variant/corruption for **`門牡`** (gate-bolt). Means **“to lift a gate-bolt.”** |
| `shuowen:8436` | 弓 | 王弓、弧弓以射甲革甚質 | 王 and 弧 bows for shooting very hard armor and leather | **Mistranslation.** From *Zhouli* (`甲革椹質`): `甚質` = **`椹質`**, a **wooden target-block/chopping-block**, not "very hard." Suggest: `for shooting through armor, hide, and target-blocks`. |
| `shuowen:9328` | 鍰 | 《罰書》曰：“列百鍰。” | The Book of Punishments says: 'Set out one hundred 鍰.' | `《罰書》` is a source corruption for **`《周書》`** (*Book of Zhou*, *Lüxing*: `其罰百鍰`, "the fine is one hundred *huan*"). There is no text called "The Book of Punishments." |
| `shuowen:9489` | 䡅 | 《周禮》曰：“孤乘夏䡅。” | The Rites of Zhou says: 'An isolated minister rides a 夏䡅 carriage.' | **Mistranslation.** `孤` (*gū*) is the high noble rank of **Senior Dignitary** (the Three Solitaries, cf. `shuowen:2456` `"high dignitary"`), not an "isolated minister." |

---

## 4. Source-Text Corruptions & Encoding Errors

The upstream Shuowen.org Chinese text contains a recurring class of **simplified-character / OCR corruptions**—most strikingly, rare Seal/Kangxi graphs were replaced by unrelated simplified chemical-element or silk-radical characters (`钉`, `钋`, `钍`, `钐`, `钕`, `钇`, `钙`, `钌`, `红`, `纸`, `纺`, `绉`, `纻`, `绁`, `纨`, `绂`, `纪`, `细`, `终`, `绅`, `纷`).

### 4.1 Corruptions Not Flagged in the English Draft (High Priority)

These entries silently translate corrupted headwords or components without flagging `[UNCERTAIN]` or noting the textual error:

- **`shuowen:2333` (羭):** Source reads `夏羊牡曰羭` (duplicating `2334` 羖 `夏羊牡曰羖`). Standard *Shuowen* reads `夏羊牝曰羭` ("A **female** Xia sheep is called 羭").
- **`shuowen:3558` (𣓁):** Source reads `从木、纨`. `纨` is a corruption for `𠁁` / `𢀖` (the phonetic/structural component). Draft translates `"Formed from 木 and 纨"` without comment.
- **`shuowen:3670` (㭉):** Source reads `从木；绂，象形`. `绂` is a corruption for `𠃨` (the pictographic spade blade). Draft translates `"绂 is pictographic"` without comment.
- **`shuowen:4605` (钍):** Headword `钍` (thorium) is a corruption for **`寘`** (`从宀眞聲`, "to place/set down"). Unflagged in draft.
- **`shuowen:5492` (𧡸):** Source reads `讀若钙` (calcium). Corruption for `讀若兜` (or `槩`). Unflagged in draft.
- **`shuowen:5525` (钐):** Headword `钐` (samarium) is a corruption for **`𣤁`** (`从欠䍃聲`, breath issuing). Unflagged in draft.
- **`shuowen:7663` (𠃉):** Source reads `借从𠃉` instead of `皆从𠃉`. Translated literally as `"borrow"` without flagging.
- **`shuowen:8950` (终):** Headword `终` is a corruption for **`𪛇`** (`从龜夂聲`, a turtle name). Unflagged in draft.
- **`shuowen:9111` (细):** Headword `细` is a corruption for **`墾`** (`耕也。从土豤聲`, "to plow/reclaim land"). Unflagged in draft.

### 4.2 Corruptions Flagged in the Draft (with Suggested Philological Identifications)

The draft commendably caught and flagged these corruptions; below are the standard *Shuowen* restorations to aid editorial review:

- **`shuowen:974` (單):** `从吅、红` → should be `从吅、甲`.
- **`shuowen:1565` (譽):** `（纤）也` → should be **`稱也`** ("To praise"). The draft note `[The intended gloss cannot be established here]` can be replaced with the standard restoration.
- **`shuowen:2118` (钉):** Headword `钉` → should be **`𥄎`** (`目` + `幵`).
- **`shuowen:2220` (者):** `纺聲。纺，古文旅字` → should be ancient-script `旅` (`𣄻` / `𣥕`).
- **`shuowen:2280` (雉):** `東方曰钕` → `钕` (neodymium) is a corruption for **`𪅿` / `鶅`**.
- **`shuowen:2426` (绉):** Headword `绉` → should be **`𪀘`** (`鳥` + `皀`).
- **`shuowen:2600` (胃):** `纻，象形` → should be `𠬛` / `田` (stomach pictograph).
- **`shuowen:2605` (钋):** Headword `钋` (polonium) → should be **`膺`** (`从肉𤸰聲`, "chest").
- **`shuowen:3037` (丂):** `纸上礙於一也` → `纸` is a corruption for `𠃑`.
- **`shuowen:3257` (今) & `3308` (市) & `8973` (凡):** `绁` / `绅` → corruptions for ancient-script `及` (`𠄠`).
- **`shuowen:3671` (㭒):** `徙土纪` → `纪` is a corruption for **`輂`** ("a cart/barrow for moving earth").
- **`shuowen:3692` (椷):** `钌也` → `钌` (ruthenium) is a corruption for **`篋也`** ("a box/chest").
- **`shuowen:6749` (𥲅):** `从心钇聲` → `钇` (yttrium) is a corruption for **`竹` / `𥫗`**.
- **`shuowen:9440` (新):** `从斤新聲` → should be **`从斤𣓏聲`**.
- **`shuowen:9666` (𨽝):** `纷聲。纷，籒文嗌字` → `纷` is a corruption for **`𦟗`** (large-seal `嗌`).

---

## 5. Resolvable `[UNCERTAIN]` Entries (Sample)

Several entries marked `[UNCERTAIN]` can be cleanly resolved and unflagged using standard classical parallels:

- **`shuowen:1168` (逑):** `又曰：“怨匹曰逑。”` — Quotes *Zuozhuan* (Huan 2, `怨耦曰仇`, where `仇` = `逑`): `"Another source says: 'An antagonistic mate is called 逑.'"` (Note that `又曰` introduces a separate source, not the *Book of Yu*.)
- **`shuowen:7892` (挑):** `《國語》曰：“卻至挑夭。”` — `夭` is a typo for `天` (*Guoyu*, Jinyu 6): `'Xi Zhi challenged Heaven.'`
- **`shuowen:8490` (𥿮):** `樂浪挈令織。` — Clear in Duan Yucai’s commentary: `"In the Lelang Statutes, the character for 'weave' (織) is written 𥿮."`
- **`shuowen:8874` (蠏):** `非蛇鮮之穴無所庇。` — Quotes *Xunzi* (*Quanxue*), where `鮮` = `鱔` (eel): `"has no shelter except the holes of snakes and eels."`
- **`shuowen:9588` (𨻌):** `磊也。` — Standard *Shuowen* gloss is `危也` ("precarious").
- **`shuowen:9831` (𢍜 / 尊):** The six *zun* vessels from *Zhouli* are accurately translated; the `[UNCERTAIN]` tag can be removed.

---

## 6. Recommended Next Steps (Action Plan)

1. **Automated Normalization Pass (Highest ROI):**
   - Unify the 6 batch-boundary templates (`Formed from X, with Y indicating the sound`, `Read like X`, `All characters in the X group are formed from X`, `Alternatively,`).
   - Normalize quotation marks (`'...'` → `“...”`) and replace all full-width `？` with ASCII `?`.
   - Replace literal `\|` with `丨` in `shuowen:81`, `709`, `1459`, `3314`, and strip the stray `\t` in `shuowen:9459`.
   - Standardize measurement units (*chi*, *cun*) and recurring official titles (*Palace Attendant Jia*, *grand officer*, *Earl*, *Marquis*).
2. **Source-Corruption Audit:**
   - Run a script across the `CHINESE:` column to flag any simplified-only Unicode characters (especially `钅`-radical chemical elements and `纟`-radical simplified forms) that should not exist in a traditional *Shuowen* text, and cross-check them against a clean traditional edition (e.g., Xu Xuan’s *Da Xu* edition + Duan Yucai’s commentary).
3. **Geographic Romanization Pass:**
   - Systematically romanize the unromanized commanderies, counties, and rivers in `shuowen:6202`–`9833` (especially the Water radical `6948`–`7434`) to match `shuowen:1`–`6201`.
4. **Targeted Philological Revision:**
   - Apply the specific corrections in Sections 3–5, then review the remaining `[UNCERTAIN]` entries in thematic batches (botanical/zoological names, ritual vessels, carriage parts, and regional dialect glosses).