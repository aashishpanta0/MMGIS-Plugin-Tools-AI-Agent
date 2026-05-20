# MMGIS-Plugin-Tools-AI-Agent

A frontend plugin for [MMGIS](https://github.com/NASA-AMMOS/MMGIS) that adds AI-powered map interaction tools.

## Tools included

| Tool | Description |
|------|-------------|
| **AgentChat** | Natural-language chat panel — sends queries to `/api/agent` and renders tool-call results directly on the map |
| **Analysis** | Interactive graphing and statistical analysis of layer data (ECharts, D3) |
| **Animation** | Create and export animated map sequences as GIF/MP4 |

## Installation

Clone into the MMGIS `src/essence/` directory:

```bash
cd <mmgis-root>/src/essence
git clone https://github.com/yunks128/MMGIS-Plugin-Tools-AI-Agent.git
```

MMGIS auto-discovers any directory whose name contains `Plugin-Tools`.

Run the plugin dep resolver (done automatically by `npm install`):

```bash
npm run plugins:install
```

## Pairing with the backend plugin

This plugin makes calls to `POST /api/agent`. You need the backend plugin running:

```bash
cd <mmgis-root>/API
git clone https://github.com/yunks128/MMGIS-Plugin-Backend-AI-Agent.git
```

## License

Apache-2.0
