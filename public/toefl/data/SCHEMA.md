# TOEFL practice app — content schemas

All content files are JSON. Encoding UTF-8. Chinese is Simplified (zh-Hans).

## Reading passage  (data/reading/*.json — one file per passage)

{
  "id": "kebab-case-unique-id",
  "title": "Short Passage Title",
  "topic": "history" | "life-science" | "social-science" | "physical-science" | "arts",
  "difficulty": 1 | 2 | 3,            // 1 easy (~TOEFL 15-19), 2 medium (20-25), 3 hard (26-30)
  "paragraphs": ["para 1 text", "para 2 text", ...],   // 5-7 paragraphs, 650-750 words total
  "glossary": [ { "term": "varve", "def_en": "...", "def_zh": "..." } ],   // 0-3 technical terms, optional
  "questions": [ <question>, ... ]     // exactly 10, in passage order
}

### Question object (reading)

Single-answer types — "options" has exactly 4 strings, "answer" is an integer index 0-3:
  "factual"              — stated detail
  "negative-factual"     — "All of the following ... EXCEPT" / "NOT mentioned"
  "inference"            — implied, not stated
  "rhetorical-purpose"   — "Why does the author mention X?"
  "vocabulary"           — "The word X in paragraph N is closest in meaning to"
  "reference"            — "The word 'it' in paragraph N refers to"
  "sentence-simplification" — "Which sentence best expresses the essential information of the highlighted sentence?"
  "insert-text"          — insert the given sentence at one of 4 marked positions

Multi-answer type — "options" has exactly 6 strings, "answer" is an array of 3 indices:
  "summary"              — "Complete the summary. Choose THREE answer choices."

{
  "id": "q1",
  "type": "<one of the above>",
  "paragraph": 2,          // 1-indexed paragraph the question targets; null for "summary"
  "stem": "Question text as it appears on the test.",
  "highlight": "exact verbatim substring copied from that paragraph",
    // REQUIRED and must match character-for-character for: vocabulary, reference,
    // sentence-simplification. Omit for other types.
  "insertSentence": "The sentence to be inserted.",
    // REQUIRED for insert-text only.
  "insertAfter": ["exact sentence 1", "exact sentence 2", "exact sentence 3", "exact sentence 4"],
    // REQUIRED for insert-text only. Four verbatim sentences from the target paragraph;
    // choice N means "insert immediately AFTER insertAfter[N]". Must appear in the
    // paragraph in this order. Omit "options" for insert-text.
  "summaryIntro": "Introductory sentence for the summary.",
    // REQUIRED for summary only.
  "options": ["...", "...", "...", "..."],
  "answer": 2,
  "explanation_en": "1-3 sentences: why the key is right AND why the most tempting distractor is wrong.",
  "explanation_zh": "同样内容的简体中文说明，1-3 句。"
}

## Listening item  (data/listening/*.json — one file per item)

{
  "id": "kebab-case-unique-id",
  "kind": "lecture" | "conversation",
  "title": "Short title (shown AFTER answering, not before)",
  "topic": "history" | "life-science" | "social-science" | "physical-science" | "arts" | "campus",
  "difficulty": 1 | 2 | 3,
  "setting_en": "In a biology class.",       // the on-screen context line
  "setting_zh": "在生物课上。",
  "speakers": [
    { "id": "prof", "label_en": "Professor", "label_zh": "教授", "voice": "female-a" }
  ],
  // voice must be one of: "female-a", "female-b", "male-a", "male-b"
  // Lectures: professor + 1-2 students. Conversations: exactly 2 speakers.
  "script": [ { "speaker": "prof", "text": "spoken line, plain prose, no stage directions" }, ... ],
  "questions": [ <question>, ... ]
}

Length: lecture 600-800 words of script (~4-5 min), conversation 350-500 words (~3 min).
Lectures get 6 questions, conversations get 5.

### Question object (listening)

Same shape as reading, minus "paragraph"/"highlight"/"insert*"/"summary*". Types:
  "gist-content"       — "What is the lecture mainly about?"
  "gist-purpose"       — "Why does the student go to see the professor?"
  "detail"             — stated detail
  "function"           — "Why does the professor say this:" (replay a line)
  "attitude"           — speaker's opinion or stance
  "organization"       — "How does the professor organize the information?"
  "connecting-content" — relationships, predictions, comparisons
  "inference"          — implied
Plus optional multi-answer:
  "multi-detail"       — "Choose TWO answers." options: 4 strings, answer: array of 2 indices.

For "function" questions add:
  "replayLine": <integer index into "script" of the line being replayed>

{
  "id": "q1", "type": "...", "stem": "...", "replayLine": 7,
  "options": ["...","...","...","..."], "answer": 1,
  "explanation_en": "...", "explanation_zh": "..."
}

## Vocabulary  (data/vocab.json)

{ "words": [ {
  "word": "abundant",
  "pos": "adj." | "n." | "v." | "adv.",
  "def_en": "present in large quantities; more than enough",
  "def_zh": "丰富的；大量的",
  "example": "Fossils are abundant in the limestone of this region.",
  "example_zh": "该地区的石灰岩中化石十分丰富。",
  "distractors": ["scarce", "fragile", "recent"],
    // 3 plausible WRONG one-word English synonyms for the MC review card.
    // Must be real academic words, similar register, clearly not synonyms.
  "band": 1 | 2 | 3     // 1 = high-frequency core, 3 = advanced
} ] }

## Hard rules for all content

- All content must be ORIGINAL. Do not reproduce real ETS/TOEFL passages or questions.
- Passages are academic-textbook register: neutral, third-person, no "you", no rhetorical flourish.
- Exactly one defensible correct answer. Distractors must be wrong for a findable reason
  (out of scope, contradicts the text, right idea wrong paragraph, too extreme), never
  merely awkward. Never make the correct answer the longest option as a pattern.
- Do NOT use em dashes anywhere. Use commas, semicolons, or parentheses.
- "highlight", "insertAfter", and any quoted text MUST be verbatim substrings of the
  paragraph text, character for character, including punctuation. This is machine-checked.
- Chinese explanations are natural Simplified Chinese, not machine-literal translation.
- Spread the correct-answer index roughly evenly across 0-3 within each passage.
- Output STRICT JSON. No comments, no trailing commas.
