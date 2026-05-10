const DAY_MS = 24 * 60 * 60 * 1000;
export function derivePackStats(items, trialEvents, drillMode, thresholdMs) {
    const byItem = new Map(items.map((item) => [item.id, []]));
    for (const event of trialEvents) {
        if (event.drillMode !== drillMode || !byItem.has(event.itemId))
            continue;
        byItem.get(event.itemId)?.push(event);
    }
    const itemStats = items.map((item) => deriveItemStats(item, byItem.get(item.id), thresholdMs));
    const attemptedEvents = itemStats.flatMap((stats) => stats.events);
    const latencies = attemptedEvents
        .filter((event) => event.correct && typeof event.latencyMs === "number")
        .map((event) => event.latencyMs)
        .sort((a, b) => a - b);
    const buckets = {
        unseen: itemStats.filter((stats) => stats.status === "unseen").length,
        learning: itemStats.filter((stats) => stats.status === "learning").length,
        slow: itemStats.filter((stats) => stats.status === "slow").length,
        fluentToday: itemStats.filter((stats) => stats.status === "fluentToday").length,
        stableFluent: itemStats.filter((stats) => stats.status === "stableFluent").length,
    };
    return {
        itemStats,
        buckets,
        totalItems: items.length,
        attempts: attemptedEvents.length,
        correctRate: attemptedEvents.length
            ? attemptedEvents.filter((event) => event.correct).length / attemptedEvents.length
            : 0,
        medianLatencyMs: median(latencies),
        fastRate: attemptedEvents.length
            ? attemptedEvents.filter((event) => event.correct && event.latencyMs <= thresholdMs).length /
                attemptedEvents.length
            : 0,
        stableCount: buckets.stableFluent,
        fluentCount: buckets.fluentToday + buckets.stableFluent,
        coverageRate: items.length ? (buckets.fluentToday + buckets.stableFluent) / items.length : 0,
    };
}
export function deriveItemStats(item, events = [], thresholdMs) {
    const sorted = [...events].sort((a, b) => Date.parse(a.createdAtIso) - Date.parse(b.createdAtIso));
    const recent = sorted.slice(-6);
    const fastEvents = sorted.filter((event) => event.correct && event.latencyMs <= thresholdMs);
    const correctEvents = sorted.filter((event) => event.correct);
    const recentCorrectRate = recent.length
        ? recent.filter((event) => event.correct).length / recent.length
        : 0;
    const recentMedianLatencyMs = median(recent
        .filter((event) => event.correct && typeof event.latencyMs === "number")
        .map((event) => event.latencyMs)
        .sort((a, b) => a - b));
    const uniqueFastDays = new Set(fastEvents.map((event) => event.createdAtIso.slice(0, 10))).size;
    const lastEvent = sorted.at(-1);
    const lastSeenAtIso = lastEvent?.createdAtIso;
    const dueAtIso = computeDueAtIso(sorted, lastEvent, uniqueFastDays, recentCorrectRate, thresholdMs);
    const depthLevel = computeDepthLevel(sorted, fastEvents, uniqueFastDays, recentCorrectRate);
    const status = computeStatus(sorted, recent, depthLevel, thresholdMs);
    return {
        item,
        events: sorted,
        attempts: sorted.length,
        correct: correctEvents.length,
        fast: fastEvents.length,
        wrong: sorted.filter((event) => !event.correct).length,
        recentCorrectRate,
        recentMedianLatencyMs,
        uniqueFastDays,
        lastSeenAtIso,
        dueAtIso,
        depthLevel,
        status,
        needScore: computeNeedScore({ sorted, recent, status, dueAtIso, recentMedianLatencyMs }, thresholdMs),
    };
}
export function getTodayEvents(events) {
    const today = new Date().toISOString().slice(0, 10);
    return events.filter((event) => event.createdAtIso?.startsWith(today));
}
function computeDepthLevel(events, fastEvents, uniqueFastDays, recentCorrectRate) {
    if (events.length === 0)
        return 0;
    if (recentCorrectRate < 0.6)
        return 1;
    if (fastEvents.length === 0)
        return 2;
    if (uniqueFastDays === 1)
        return 3;
    if (uniqueFastDays === 2)
        return 4;
    return 5;
}
function computeStatus(events, recent, depthLevel, thresholdMs) {
    if (events.length === 0)
        return "unseen";
    if (depthLevel >= 5)
        return "stableFluent";
    const last = events.at(-1);
    const today = new Date().toISOString().slice(0, 10);
    if (last?.correct && last.latencyMs <= thresholdMs && last.createdAtIso.startsWith(today)) {
        return "fluentToday";
    }
    if (recent.some((event) => !event.correct))
        return "learning";
    return "slow";
}
function computeDueAtIso(events, lastEvent, uniqueFastDays, recentCorrectRate, thresholdMs) {
    if (!lastEvent)
        return new Date().toISOString();
    if (events.length === 1 &&
        lastEvent.correct &&
        lastEvent.latencyMs <= thresholdMs &&
        recentCorrectRate >= 1) {
        return new Date(Date.parse(lastEvent.createdAtIso) + 30 * DAY_MS).toISOString();
    }
    const intervals = recentCorrectRate < 0.6
        ? [0, 0, 1, 2, 4, 7]
        : [0, 7, 14, 30, 45, 60];
    const days = intervals[Math.min(uniqueFastDays, intervals.length - 1)];
    return new Date(Date.parse(lastEvent.createdAtIso) + days * DAY_MS).toISOString();
}
function computeNeedScore({ sorted, recent, status, dueAtIso, recentMedianLatencyMs, }, thresholdMs) {
    if (status === "unseen")
        return 0;
    const isDue = Date.parse(dueAtIso) <= Date.now();
    const due = isDue ? 4 : 0;
    const wrong = recent.filter((event) => !event.correct).length * 5;
    const slow = recentMedianLatencyMs && recentMedianLatencyMs > thresholdMs ? 3 : 0;
    const lastEvent = sorted.at(-1);
    const stale = isDue && lastEvent
        ? Math.min(4, (Date.now() - Date.parse(lastEvent.createdAtIso)) / DAY_MS)
        : 0;
    return due + wrong + slow + stale;
}
function median(values) {
    if (!values.length)
        return null;
    const middle = Math.floor(values.length / 2);
    return values.length % 2
        ? values[middle]
        : Math.round((values[middle - 1] + values[middle]) / 2);
}
