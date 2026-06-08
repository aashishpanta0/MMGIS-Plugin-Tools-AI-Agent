# MMGIS-Plugin-Tools-AI-Agent

A frontend plugin for [MMGIS](https://github.com/NASA-AMMOS/MMGIS) that adds AI-powered map interaction tools.

## Tools included

| Tool | Description |
|------|-------------|
| **AgentChat** | Natural-language chat panel — sends queries to `/api/agent` and renders tool-call results directly on the map |
| **Analysis** | Interactive graphing and statistical analysis of layer data (ECharts, D3) |
| **Animation** | Create and export animated map sequences as GIF/MP4 |

## Installation

Clone into the MMGIS `src/essence/` directory (not `API/`):

```bash
cd <mmgis-root>/src/essence
git clone https://github.com/yunks128/MMGIS-Plugin-Tools-AI-Agent.git MMGIS-Plugin-Tools-AI-Agent
```

MMGIS auto-discovers any directory whose name contains `Plugin-Tools`.

```bash
cd <mmgis-root>
npm run plugins:install
npm start
```

## Pairing with the backend plugin

AgentChat calls `POST /api/agent`. Install the backend plugin:

```bash
cd <mmgis-root>/API
git clone https://github.com/yunks128/MMGIS-Plugin-Backend-AI-Agent.git
```

See [MMGIS-Plugin-Backend-AI-Agent](https://github.com/yunks128/MMGIS-Plugin-Backend-AI-Agent) for `WITH_AGENT`, LLM keys, and `mmgis-stac` setup.

## Development (webpack on port 8889)

- Use the app at **`http://localhost:8889`** (dev server proxies API routes to Express on 8888).
- Copilot API calls use relative `ROOT_PATH` paths and work through that proxy.
- **Identifier + STAC layers**: Pixel values use core MMGIS `IdentifierTool.js`, which in dev calls `http://localhost:8888/titilerpgstac/...` even when you open **8889**. A **504** / `Failed to fetch` on that URL usually means **pgSTAC is not migrated** on `mmgis-stac` — run the backend plugin `scripts/bootstrap-mmgis-stac.js` (see backend README). Empty collections also time out.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `404` on `/api/agent` | Install backend plugin; `WITH_AGENT=true` |
| Copilot auth errors | Configure Azure (`az login`) or `GEMINI_API_KEY` (backend README) |
| Duplicate Analysis/Animation tools | Remove any copy of this repo under `API/`; keep only `src/essence/MMGIS-Plugin-Tools-AI-Agent` |
| Analysis layer list shows Frozon demo layers | Enable **Analysis** in mission tools; layers now come from the active MMGIS mission via `/api/agent/analytics` |

## License

Apache-2.0
