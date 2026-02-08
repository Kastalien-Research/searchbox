# Workflow Tasks — Conceptual Guide

This document explains the research patterns behind each workflow task type. For exact call syntax and parameter schemas, see the [README](./README.md#workflow-tasks).

## Overview

Workflow tasks are long-running background operations created via `tasks.create`. They orchestrate multi-step research patterns — creating websets, polling for completion, collecting results, and applying analysis — in a single fire-and-forget call.

**Usage pattern:**

```
tasks.create  →  tasks.get (poll)  →  tasks.result (retrieve)
```

Each task runs asynchronously. Poll with `tasks.get` to check progress, then retrieve full results with `tasks.result` once complete.

## Choosing a Workflow

| If you need... | Use |
|---|---|
| A simple search → enrich → collect pipeline | [`lifecycle.harvest`](#lifecycle-harvest) |
| High-confidence results via multiple search angles | [`convergent.search`](#convergent-search) |
| To test a hypothesis with counter-evidence | [`adversarial.verify`](#adversarial-verification) |
| Diverse examples across multiple dimensions | [`qd.winnow`](#quality-diversity-search-qd-winnow) |
| Broad collection + deep per-entity information | [`research.verifiedCollection`](#verified-collection) |
| To answer a research question directly | [`research.deep`](#research-deep) |

## Lifecycle Harvest

**Type:** `lifecycle.harvest`

The simplest end-to-end workflow. Creates a webset with search and optional enrichments, polls until idle, then collects all items.

**When to use:** Standard entity collection where you need a straightforward search → enrich → collect pipeline without multi-angle or adversarial patterns.

**Steps:**
1. Validate query and entity parameters
2. Create webset with search + enrichments
3. Poll until webset reaches idle state
4. Collect all items via auto-pagination

**Key args:** `query`, `entity`, `enrichments?`, `criteria?`, `count?`

**Example:**
```json
{
  "operation": "tasks.create",
  "args": {
    "type": "lifecycle.harvest",
    "args": {
      "query": "AI startups in San Francisco",
      "entity": {"type": "company"},
      "enrichments": [
        {"description": "CEO name", "format": "text"},
        {"description": "Annual revenue in USD", "format": "number"}
      ],
      "count": 25
    }
  }
}
```

## Convergent Search

**Type:** `convergent.search`

Run the same topic through N different query framings, then deduplicate and find entities that appear across multiple searches. Entities found via multiple angles have higher confidence.

### Concept: Triangulation

Different search queries surface different slices of the entity space. An entity appearing in only one query might be a fringe result, but an entity found by 3 independent queries is almost certainly relevant.

### Deduplication

Two-pass matching identifies the same entity across different queries:

1. **Exact URL match** — same URL in different result sets
2. **Fuzzy name match** — Dice coefficient similarity above 0.85 threshold

The **Dice coefficient** measures bigram overlap between two strings. For strings A and B, it counts shared 2-character substrings and normalizes: `2 * |shared bigrams| / (|bigrams in A| + |bigrams in B|)`. This catches variations like "OpenAI Inc" vs "OpenAI" that exact matching would miss.

### Results

- **Intersection**: Entities found in 2+ queries. Higher confidence — multiple angles agree.
- **Unique**: Entities found in only one query. Lower confidence but may include valuable outliers.
- **Overlap matrix**: Pairwise counts showing which query pairs agree most. Reveals which framings are redundant vs complementary.

### When to use

- Terminology varies across the domain (the same thing has different names in different contexts)
- You need high-confidence entity lists and are willing to run multiple searches
- You want to quantify consensus across different search framings

**Key args:** `queries` (2-5 strings), `entity`, `criteria?`, `count?`

**Worked example:** Finding autonomous vehicle companies with three queries:
- "companies building autonomous vehicles"
- "self-driving car startups with funding"
- "autonomous driving technology firms"

A company like Waymo appears in all three → high confidence. A niche robotaxi startup appears in only one → lower confidence but still potentially interesting.

## Adversarial Verification

**Type:** `adversarial.verify`

Actively seek disconfirming evidence for a hypothesis. Two parallel searches run simultaneously — one for supporting evidence, one for counter-evidence.

### Concept: Dialectical Evidence Gathering

Confirmation bias makes it easy to find evidence that supports what you already believe. This workflow forces the opposing search, ensuring you see both sides before forming conclusions.

### Structure

- **Thesis**: The hypothesis being tested (plain text)
- **Thesis query**: Search query designed to find supporting evidence
- **Antithesis query**: Search query designed to find counter-evidence
- **Synthesis** (optional): If enabled, the Exa Research API generates a balanced verdict from both evidence sets, including confidence level, key supporting factors, key countering factors, and identified blind spots.

### When to use

- Hypothesis testing — before committing resources based on an assumption
- Due diligence — evaluating claims from third parties
- Combating confirmation bias — forcing yourself to look at counter-evidence

**Key args:** `thesis`, `thesisQuery`, `antithesisQuery`, `synthesize?`, `entity?`, `enrichments?`

**Worked example:** Testing "Remote work improves developer productivity":
- Thesis query: "studies showing remote work increases developer output and code quality"
- Antithesis query: "evidence remote work reduces developer collaboration and productivity"
- With `synthesize: true`, the Research API weighs both evidence sets and produces a balanced assessment.

## Quality-Diversity Search (QD Winnow)

**Type:** `qd.winnow`

Inspired by [MAP-Elites](https://arxiv.org/abs/1504.04909), this workflow treats search criteria as behavioral coordinates and enrichments as fitness measures. Instead of just finding the "best" results, it finds the best result in each niche of the search space.

### Core Concepts

**Criteria = Behavioral Coordinates.** Each criterion defines a dimension. An item either satisfies a criterion (1) or doesn't (0). With N criteria, there are 2^N possible niches — every combination of satisfied/not-satisfied.

**Enrichments = Fitness.** Enrichment completeness and quality scores how "good" an entity is within its niche. An item with all enrichments successfully extracted scores higher than one with gaps.

**Niche Classification.** Each item is evaluated against all criteria, producing a boolean vector. This vector becomes a niche key. For example, with 3 criteria, an item satisfying the first two but not the third gets niche key `1,1,0`.

### Selection Strategies

| Strategy | Behavior |
|---|---|
| `diverse` (default) | Best item per niche — maximizes coverage across the space |
| `all-criteria` | Only items satisfying every criterion — the strictest filter |
| `any-criteria` | Items satisfying at least one criterion — excludes total misses |

### Quality Metrics

- **Coverage**: Fraction of possible niches that have at least one item. Coverage of 0.75 with 3 criteria means 6 of 8 niches are populated.
- **Diversity**: Shannon entropy of niche distribution, normalized to [0, 1]. High diversity means items spread evenly across niches rather than clustering.
- **Stringency**: Ratio of items found to items analyzed. Low stringency means the search is highly selective.
- **Average fitness**: Mean enrichment quality score across elite items.

### Descriptor Feedback

Per-criterion success rates reveal whether your criteria are well-calibrated:
- **< 5% success rate** → too strict, almost nothing qualifies
- **> 95% success rate** → not discriminating, everything qualifies
- **5-95%** → good discriminator, meaningfully divides the space

This feedback is valuable for iterating on criteria — tighten loose criteria, relax strict ones, and re-run.

### Optional Critique

With `critique: true`, the Exa Research API reviews the results and assesses coverage gaps, result quality, criteria blind spots, and unexpected findings worth investigating.

### When to use

- Exploring a problem space where you want diverse examples, not just top results
- Building a portfolio (e.g., investment targets across sectors and stages)
- Iterating on search criteria — descriptor feedback shows what to tighten or loosen

**Key args:** `query`, `entity`, `criteria`, `enrichments`, `selectionStrategy?`, `critique?`

**Worked example:** Finding AI safety labs with 3 criteria:
1. "Has published peer-reviewed research on AI alignment"
2. "Has received government or philanthropic funding"
3. "Founded within the last 5 years"

This creates 2^3 = 8 possible niches. The `diverse` strategy returns the best lab in each populated niche — from well-funded veteran labs (`1,1,0`) to scrappy new startups with published research (`1,0,1`). Descriptor feedback might show criterion 3 has only 10% success rate (most labs are older), suggesting you could relax the founding date to get better coverage.

## Verified Collection

**Type:** `research.verifiedCollection`

Two-stage pipeline: first collect entities via a webset search, then run deep research on each entity using the Exa Research API.

### Concept: Breadth Then Depth

Stage 1 (breadth) discovers entities matching your search criteria. Stage 2 (depth) selectively deep-dives into the top N entities using customizable research prompts.

### Template Expansion

Research prompts use placeholders that get filled per-entity:
- `{{name}}` — entity name (company name, person name, or article title)
- `{{url}}` — entity URL
- `{{description}}` — entity description

Example template: "Research {{name}} ({{url}}) and describe their main product, key competitors, and recent funding."

### Concurrency Control

Research API calls run in parallel with a semaphore limiting concurrency to 3 simultaneous requests. This balances throughput against API rate limits.

### When to use

- You need detailed information per entity, not just a list
- Building entity profiles that require synthesis beyond what enrichments provide
- Research questions that need the Research API's depth (longer-form analysis vs. enrichment's single-field extraction)

**Key args:** `query`, `entity`, `researchPrompt`, `researchLimit?`, `researchModel?`, `researchSchema?`

**Worked example:** Finding AI safety labs and researching each one:
```json
{
  "operation": "tasks.create",
  "args": {
    "type": "research.verifiedCollection",
    "args": {
      "query": "AI safety research organizations",
      "entity": {"type": "company"},
      "researchPrompt": "Research {{name}} and describe: (1) their primary AI safety research focus, (2) notable publications, (3) key team members, (4) funding sources",
      "researchLimit": 10,
      "count": 25
    }
  }
}
```

## Research Deep

**Type:** `research.deep`

A thin wrapper around the Exa Research API. Sends a research question and returns the Research API's synthesized answer. No websets involved — this is pure question answering.

### When to use

- You have a research question that doesn't need entity collection
- You want the Research API's synthesis capability directly
- Quick answers to factual or analytical questions

**Key args:** `instructions`, `model?` (`exa-research-fast`, `exa-research`, `exa-research-pro`), `outputSchema?`

## Comparison

| Workflow | Searches | Dedup | Research API | Best for |
|---|---|---|---|---|
| `lifecycle.harvest` | 1 | No | No | Simple collection |
| `convergent.search` | 2-5 | Yes (URL + fuzzy name) | No | High-confidence lists |
| `adversarial.verify` | 2 | No | Optional (synthesis) | Hypothesis testing |
| `qd.winnow` | 1 | No | Optional (critique) | Diverse exploration |
| `research.verifiedCollection` | 1 | No | Yes (per entity) | Entity profiles |
| `research.deep` | 0 | No | Yes (direct) | Question answering |

## Shared Patterns

All workflows share these implementation patterns:

- **Fire-and-forget execution**: `tasks.create` returns immediately with a task ID. The workflow runs asynchronously.
- **Progressive checkpoints**: Workflows call `setPartialResult` at key stages, so `tasks.result` returns useful data even if the workflow is still running or was cancelled.
- **Cancellation-aware polling**: Every workflow checks for cancellation between steps and cleans up resources (cancels websets) when cancelled.
- **Step timing**: Each workflow tracks per-step timing, returned in the `steps` field of the result.
- **Result summaries**: Every result includes a `_summary` field with a human-readable one-liner describing what happened.
