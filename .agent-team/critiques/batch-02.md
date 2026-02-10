# Critique: Batch 02

## Strengths
- Responded well to Batch 01 critique: moved from pure categorization to actual query drafting (8 queries)
- Good breadth in extended discovery -- legal analysts, investigative journalists, patent examiners show creative lateral thinking
- Triage decision (S13) is smart -- filtering to top 12 by adoption readiness, findability, and reasoning need is the right prioritization framework
- Entity type choices are appropriate: `github_repo` for MCP devs, `tweet` for power users, `research_paper` for CoT researchers
- Added developer tool companies (Q7) which was flagged as missing in Batch 01 critique

## Issues
- **Query details missing from the batch file**: We see labels, entity types, and counts but NOT the actual query strings, criteria, or enrichments. This is the critical information needed for review. The batch summary needs to include the full query specs or at least the query strings and criteria for each.
- **No criteria visible**: Cannot evaluate whether the criteria are well-formed yes/no questions. This is the most important aspect of query quality.
- **No enrichments planned**: Still no mention of contact extraction enrichments.
- **Q5 (OSINT/Threat Intel) remains questionable**: Same concern from Batch 01 -- the connection to Thoughtbox is indirect. These companies use specific intelligence platforms, not general structured reasoning tools. The slot might be better used for "AI consulting firms" or "ML ops companies."
- **Q3 (Claude Code Power Users via tweet)**: Good idea but high noise risk. Tweets mentioning Claude Code may be casual mentions, not power users. Criteria will need to be very specific to filter for people who actually build workflows, not just tweet about the product once.
- **Count of 100 for Q1 and Q3**: Appropriate for broad searches, but may return low-quality results at the tail. Consider whether 50 with tighter criteria would yield better results.
- **Q8 (Chain-of-Thought Researchers via research_paper)**: Smart -- these are people who literally study structured reasoning. But the entity type `research_paper` returns papers, not people. How do we get from papers to contactable researchers? Need an enrichment that extracts author names and affiliations.

## Missing Angles
- **Open source maintainers** (still not covered as a standalone query): These are different from MCP server developers -- think maintainers of LangChain, AutoGen, CrewAI, etc.
- **LinkedIn profiles**: Not a single query uses `linkedin_profile` entity type. This is the most direct path to contactable professionals. Consider queries for: AI/ML engineers, prompt engineers, AI product managers.
- **Academic researchers as persons**: Q4 targets AI safety researchers as `person`, good. But no query targets ML/AI researchers more broadly -- people publishing on agents, tool use, reasoning.
- **Enterprise AI teams**: Still not covered. Large companies with AI centers of excellence would be valuable feedback sources.
- **Technical content creators**: YouTubers, bloggers, newsletter authors covering AI tools and workflows.

## Query Feedback
- Cannot provide specific query feedback because query strings and criteria are not included in the batch summary
- For Batch 03, PLEASE include the full query spec for each query, at minimum:
  - The query string
  - The criteria array
  - Planned enrichments
- This is essential for the review to be useful

## Coverage Checklist Update
- [x] Individual developers/engineers -- Q1 (MCP Server Developers)
- [x] AI/ML startups -- Q6 (AI-Native Startups)
- [ ] Research groups/labs -- partially (Q8 targets papers, not labs)
- [ ] Open source maintainers -- NOT covered as standalone
- [x] Technical content creators -- NOT covered
- [x] Enterprise AI teams -- NOT covered
- [ ] Consultants/freelancers -- NOT covered
- [x] Academic researchers -- Q4 (AI Safety), Q8 (CoT)
- [x] Dev tool companies -- Q7
- [ ] AI community leaders/influencers -- Q3 partially (tweet), but needs dedicated query

## Suggestions for Next Batch
1. **Include full query specs** in the batch file -- query strings, criteria arrays, and enrichment plans. Without these, the review cycle is operating blind.
2. **Add at least one `linkedin_profile` query** -- this entity type is the most direct path to contactable professionals.
3. **Cover open source maintainers** with a dedicated `github_repo` or `person` query targeting maintainers of popular AI/agent frameworks.
4. **Plan enrichments for every query** -- at minimum, one enrichment per query to extract email, website, or social media handles.
5. **For Q8 (research_paper)**, plan an enrichment that extracts author names, emails, and institutional affiliations from papers.
6. **Sharpen Q3 criteria** to filter for people who build workflows or tools with Claude Code, not just casual mentions.
