import { buildLayerIndex } from '../AgentChat/rendererUtils.js'

function getAnalyticsBaseUrl() {
    const root = (window?.mmgisglobal?.ROOT_PATH || '').replace(/\/+$/, '')
    return `${root}/api/agent/analytics`
}

function isAnalyzableLayer(item) {
    const cfg = item?.config || {}
    const url = (cfg.url || cfg.source || '').toLowerCase()
    const srcType = (cfg.sourceType || '').toLowerCase()
    const layerType = (cfg.type || '').toLowerCase()
    if (layerType === 'header') return false
    const isStac =
        srcType === 'stac-collection' || url.startsWith('stac-collection:')
    const isCog =
        url.includes('.tif') || url.includes('cog:') || srcType === 'cog'
    const hasLocalData = cfg.throughTileServer === true
    return isStac || isCog || hasLocalData
}

function buildLayerInfo(item) {
    const cfg = item.config || {}
    const timeCfg = cfg.time || {}
    const start =
        timeCfg.availableStart ||
        timeCfg.initialstart ||
        timeCfg.start ||
        null
    const end =
        timeCfg.availableEnd || timeCfg.initialend || timeCfg.end || null
    const epsgMatch = String(
        window?.mmgisglobal?.customCRS?.code || 'EPSG:4326'
    ).match(/EPSG:(\d+)/i)
    return {
        name: item.displayName,
        sourceType: cfg.sourceType || cfg.type || null,
        time_range: {
            start: start || 'N/A',
            end: end || 'N/A',
        },
        shape: ['time', 'y', 'x'],
        dimensions: ['time', 'y', 'x'],
        epsg: epsgMatch ? Number(epsgMatch[1]) : 4326,
        units: cfg.cogUnits || null,
        visible: item.visible,
        config: cfg,
    }
}

export function buildMissionLayerCatalog() {
    const index = buildLayerIndex()
    const analyzable = index.filter(isAnalyzableLayer)
    const layers = {}
    analyzable.forEach((item) => {
        layers[item.displayName] = buildLayerInfo(item)
    })
    const names = Object.keys(layers)
    const defaultLayer =
        analyzable.find((item) => item.visible)?.displayName || names[0] || null
    return {
        layers,
        default_layer: defaultLayer,
    }
}

function getLeafletMap() {
    return window?.mmgisAPI?.map || window?.Map_?.map || null
}

export function projectLatLng(lat, lng) {
    const L = window.L
    const map = getLeafletMap()
    if (map && L && typeof map.project === 'function') {
        const pt = map.project(L.latLng(Number(lat), Number(lng)))
        return { x: pt.x, y: pt.y }
    }
    const crs = window?.mmgisglobal?.customCRS
    if (crs && typeof crs.project === 'function') {
        const pt = crs.project({ lat: Number(lat), lng: Number(lng) })
        return { x: pt.x, y: pt.y }
    }
    return { x: Number(lng), y: Number(lat) }
}

export function unprojectProjected(x, y) {
    const L = window.L
    const map = getLeafletMap()
    if (map && L && typeof map.unproject === 'function') {
        const latlng = map.unproject(L.point(Number(x), Number(y)))
        return { lat: latlng.lat, lng: latlng.lng }
    }
    const crs = window?.mmgisglobal?.customCRS
    if (crs && typeof crs.unproject === 'function') {
        const latlng = crs.unproject({ x: Number(x), y: Number(y) })
        return { lat: latlng.lat, lng: latlng.lng }
    }
    return { lat: Number(y), lng: Number(x) }
}

export function projectedBoundsToGeoBbox(xmin, ymin, xmax, ymax) {
    const corners = [
        unprojectProjected(xmin, ymin),
        unprojectProjected(xmin, ymax),
        unprojectProjected(xmax, ymin),
        unprojectProjected(xmax, ymax),
    ]
    const lats = corners.map((c) => c.lat)
    const lngs = corners.map((c) => c.lng)
    return [
        Math.min(...lngs),
        Math.min(...lats),
        Math.max(...lngs),
        Math.max(...lats),
    ]
}

function buildAnalyticsUrl(path) {
    const base = getAnalyticsBaseUrl().replace(/\/+$/, '')
    const safePath = String(path || '').replace(/^\/+/, '')
    return `${base}/${safePath}`
}

async function fetchAnalyticsJson(path, { params = {}, method = 'GET', body = null } = {}) {
    const url = new URL(buildAnalyticsUrl(path), window.location.origin)
    if (method === 'GET') {
        Object.entries(params).forEach(([key, value]) => {
            if (value != null && value !== '') {
                url.searchParams.set(key, String(value))
            }
        })
    }
    const options = { method }
    if (method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = JSON.stringify(body || params || {})
    }
    const response = await fetch(url.toString(), options)
    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error(json.error || `Analytics request failed (${response.status})`)
    }
    if (json.error) {
        throw new Error(json.error)
    }
    return json
}

function getMissionQuery() {
    const mission =
        window?.L_?.mission ||
        window?.mmgisglobal?.mission ||
        new URLSearchParams(window.location.search).get('mission')
    return mission ? { mission } : {}
}

export async function routeAnalysisApiCall(
    endpoint,
    params = {},
    method = 'GET',
    body = null,
    toolContext = {}
) {
    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const missionParams = getMissionQuery()

    if (normalized === '/layers') {
        return buildMissionLayerCatalog()
    }

    if (normalized === '/histogram/projected') {
        const bins = params.bins || 50
        const query = {
            ...missionParams,
            layer_name: params.ds || params.layer || toolContext.selectedLayer,
            bins,
            startTime: params.startTime,
            endTime: params.endTime,
        }
        if (
            params.xmin != null &&
            params.ymin != null &&
            params.xmax != null &&
            params.ymax != null
        ) {
            const bbox = projectedBoundsToGeoBbox(
                Number(params.xmin),
                Number(params.ymin),
                Number(params.xmax),
                Number(params.ymax)
            )
            query.b = bbox.join(',')
        } else if (params.b) {
            query.b = params.b
        }
        return fetchAnalyticsJson('histogram/data', { params: query })
    }

    if (normalized === '/timeseries/projected') {
        const query = {
            ...missionParams,
            layer: params.layer || toolContext.selectedLayer,
            startTime: params.startTime,
            endTime: params.endTime,
        }
        if (params.x != null && params.y != null) {
            const latlng = unprojectProjected(params.x, params.y)
            query.lat = latlng.lat
            query.lon = latlng.lng
        }
        if (
            params.xmin != null &&
            params.ymin != null &&
            params.xmax != null &&
            params.ymax != null
        ) {
            const bbox = projectedBoundsToGeoBbox(
                Number(params.xmin),
                Number(params.ymin),
                Number(params.xmax),
                Number(params.ymax)
            )
            query.b = bbox.join(',')
            query.xmin = params.xmin
            query.ymin = params.ymin
            query.xmax = params.xmax
            query.ymax = params.ymax
        }
        return fetchAnalyticsJson('timeseries/projected', { params: query })
    }

    if (normalized === '/timeseries/batch') {
        const projectedPoints = Array.isArray(params.points) ? params.points : []
        const points = projectedPoints.map((point) => {
            if (point.x != null && point.y != null) {
                const latlng = unprojectProjected(point.x, point.y)
                return {
                    id: point.id,
                    lat: latlng.lat,
                    lon: latlng.lng,
                    x: point.x,
                    y: point.y,
                }
            }
            return point
        })
        return fetchAnalyticsJson('timeseries/batch', {
            method: 'POST',
            body: {
                ...missionParams,
                points,
                datasets: params.datasets,
                startTime: params.startTime,
                endTime: params.endTime,
            },
        })
    }

    const fallbackPath = normalized.replace(/^\/+/, '')
    return fetchAnalyticsJson(fallbackPath, { params: { ...missionParams, ...params }, method, body })
}

export { getAnalyticsBaseUrl }
