# Agent Team Briefing: Websets Query Design for Thoughtbox User Research

## Mission
Design a set of Websets queries that, when executed via the Exa Websets API, will aggregate lists of potential users to contact for Thoughtbox feedback.

## What is Thoughtbox?
Thoughtbox is an MCP (Model Context Protocol) server that provides **structured reasoning and multi-agent collaboration** for AI agents. Key features:
- **Structured reasoning**: Thought chains with branching, tagging, and session management
- **Cipher notation**: Compressed notation system for efficient reasoning
- **Multi-agent hub**: Workspace-based collaboration with problems, proposals, consensus, and channels
- **Mental models**: Built-in reasoning frameworks (first principles, OODA, etc.)
- **Deep analysis**: Pattern detection across reasoning sessions
- **Observability**: Prometheus metrics, Grafana dashboards, health checks

Target users are people who work with AI agents, build AI tools, do structured research, or need better reasoning workflows.

## What are Websets?
Exa Websets are self-updating collections of web entities (companies, people, papers, etc.) built via natural language search. The API supports:

### Query Format (for `websets.create` + `searches.create`)
```json
{
  "search": {
    "query": "natural language search string",
    "entity": { "type": "company" | "person" | "research_paper" | "pdf" | "github_repo" | "tweet" | "linkedin_profile" },
    "criteria": [{ "description": "filtering criterion as natural language" }],
    "count": 50
  }
}
```

### Key Constraints
- `query`: Natural language, descriptive. Works best when specific.
- `entity.type`: Must be one of: company, person, research_paper, pdf, github_repo, tweet, linkedin_profile
- `criteria`: Array of `{description: string}` objects. Each is a yes/no filter per result.
- `count`: Number of entities to find (max ~1000)

### Enrichments (optional, applied after search)
```json
{
  "description": "Extract their email or contact info",
  "format": "text" | "options"
}
```

### Example Query
```json
{
  "query": "AI developer tools startups building agent frameworks",
  "entity": { "type": "company" },
  "criteria": [
    { "description": "Must have a product related to AI agents or LLMs" },
    { "description": "Must be a startup or small company, not a large enterprise" }
  ],
  "count": 50
}
```

## User Types to Consider (starting point)
1. AI tool builders — companies/people building with LLMs, agents, MCP
2. Researchers — academic or industry, using AI for synthesis
3. Knowledge workers — analysts, consultants, strategists
4. Developer tool companies — IDEs, code assistants
5. Open source contributors — MCP ecosystem, agent frameworks
6. Content creators — technical writers, educators
7. Product managers — structured decision-making needs
8. Data scientists — exploratory analysis, reasoning support
9. Philosophy/logic enthusiasts — formal reasoning
10. Enterprise AI teams — companies deploying AI internally

The Thinker should discover MORE types through reasoning.

## Communication Protocol
- **Thoughts**: `.agent-team/thoughts/batch-NN.md`
- **Critiques**: `.agent-team/critiques/batch-NN.md`
- **Directions**: `.agent-team/directions/checkpoint-NN.md`
- **Hub workspace**: `f60f80a9-dbc2-40db-aadc-43ea758d2362`
  - Design channel: `87974c03-5d71-40ea-ac5d-c17f9a58979f`
  - Review channel: `badcdee6-be6d-4b0c-aef5-0cbe3072ab7d`
  - Coordination channel: `68034c5d-dc54-4cdc-bac9-1cded0e9dc26`
- **Final output**: `.agent-team/final-queries.json`
