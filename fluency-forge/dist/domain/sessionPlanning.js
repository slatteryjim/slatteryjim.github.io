import { getExpectedAnswer, isModeCompatible } from "./trials.js";
export function createSessionPlan({ pack, stats, drillMode, settings }) {
    const compatibleItems = pack.items.filter((item) => isModeCompatible(item, drillMode));
    const statsById = new Map(stats.itemStats.map((itemStats) => [itemStats.item.id, itemStats]));
    const today = new Date().toISOString().slice(0, 10);
    const newToday = stats.itemStats.filter((itemStats) => itemStats.events.some((event) => event.createdAtIso.startsWith(today) && event.metadata?.wasNewItem)).length;
    const newLimitRemaining = Math.max(0, settings.dailyNewLimit - newToday);
    const unseen = compatibleItems.filter((item) => statsById.get(item.id)?.status === "unseen");
    const dueOrWeak = compatibleItems
        .filter((item) => {
        const itemStats = statsById.get(item.id);
        if (!itemStats || itemStats.status === "unseen")
            return false;
        return itemStats.needScore > 0 || Date.parse(itemStats.dueAtIso) <= Date.now();
    })
        .sort((a, b) => (statsById.get(b.id)?.needScore ?? 0) - (statsById.get(a.id)?.needScore ?? 0));
    const learned = compatibleItems
        .filter((item) => (statsById.get(item.id)?.attempts ?? 0) > 0)
        .sort((a, b) => (statsById.get(b.id)?.needScore ?? 0) - (statsById.get(a.id)?.needScore ?? 0));
    const newItems = unseen.slice(0, Math.max(settings.boardSize, newLimitRemaining));
    const sessionTargets = uniqueItems([
        ...dueOrWeak.slice(0, Math.ceil(settings.boardSize * 0.55)),
        ...learned.slice(0, Math.ceil(settings.boardSize * 0.25)),
        ...newItems,
        ...unseen,
    ]).slice(0, settings.boardSize);
    const prompts = [];
    const broadCount = Math.min(8, settings.sessionLength);
    const focusedCount = Math.max(0, settings.sessionLength - broadCount - 4);
    const recheckCount = Math.max(0, settings.sessionLength - broadCount - focusedCount);
    prompts.push(...takeCycled(sessionTargets, broadCount, "broad", statsById));
    prompts.push(...takeCycled(sortByNeed(sessionTargets, statsById), focusedCount, "focused", statsById));
    prompts.push(...takeCycled(sortByNeed(sessionTargets, statsById).slice(0, 6), recheckCount, "recheck", statsById));
    return prompts.map((prompt, index) => ({
        ...prompt,
        index,
        miniBatchId: `${prompt.phase}-board`,
    }));
}
export function buildAnswerBoard({ pack, drillMode, targetItems, boardSize }) {
    const correctAnswers = uniqueStrings(targetItems.map((item) => getExpectedAnswer(item, drillMode))).slice(0, boardSize);
    const distractors = pack.items
        .map((item) => getExpectedAnswer(item, drillMode))
        .filter((answer) => answer && !correctAnswers.includes(answer));
    return [...correctAnswers, ...uniqueStrings(distractors).slice(0, boardSize - correctAnswers.length)]
        .sort(compareAnswers);
}
export function getItemsForBatch(plan, currentIndex) {
    const current = plan[currentIndex];
    if (!current)
        return [];
    return plan
        .filter((entry) => entry.miniBatchId === current.miniBatchId)
        .map((entry) => entry.item);
}
function takeCycled(items, count, phase, statsById) {
    if (!items.length || count <= 0)
        return [];
    return Array.from({ length: count }, (_, index) => ({
        item: items[index % items.length],
        phase,
        wasNewItem: (statsById.get(items[index % items.length].id)?.attempts ?? 0) === 0,
    }));
}
function uniqueItems(items) {
    return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
function sortByNeed(items, statsById) {
    return [...items].sort((a, b) => {
        const scoreDifference = (statsById.get(b.id)?.needScore ?? 0) - (statsById.get(a.id)?.needScore ?? 0);
        return scoreDifference || a.simplified.localeCompare(b.simplified);
    });
}
function uniqueStrings(values) {
    return Array.from(new Set(values));
}
function compareAnswers(a, b) {
    const aNumber = Number(a);
    const bNumber = Number(b);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
        return aNumber - bNumber;
    }
    return a.localeCompare(b, "en", { sensitivity: "base" });
}
