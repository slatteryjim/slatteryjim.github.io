import { getExpectedAnswer, isModeCompatible } from "./trials.js";
export function createSessionPlan({ pack, stats, drillMode, settings }) {
    const compatibleItems = pack.items.filter((item) => isModeCompatible(item, drillMode));
    const candidateItems = shuffleItems(compatibleItems);
    const randomOrderById = new Map(candidateItems.map((item, index) => [item.id, index]));
    const statsById = new Map(stats.itemStats.map((itemStats) => [itemStats.item.id, itemStats]));
    const today = new Date().toISOString().slice(0, 10);
    const newToday = stats.itemStats.filter((itemStats) => itemStats.events.some((event) => event.createdAtIso.startsWith(today) && event.metadata?.wasNewItem)).length;
    const newLimitRemaining = Math.max(0, settings.dailyNewLimit - newToday);
    const unseen = candidateItems.filter((item) => statsById.get(item.id)?.status === "unseen");
    const dueOrWeak = candidateItems
        .filter((item) => {
        const itemStats = statsById.get(item.id);
        if (!itemStats || itemStats.status === "unseen")
            return false;
        return itemStats.needScore > 0 || Date.parse(itemStats.dueAtIso) <= Date.now();
    })
        .sort((a, b) => compareNeedThenRandom(a, b, statsById, randomOrderById));
    const learned = candidateItems
        .filter((item) => (statsById.get(item.id)?.attempts ?? 0) > 0)
        .sort((a, b) => compareNeedThenRandom(a, b, statsById, randomOrderById));
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
    const sortedTargets = sortByNeed(sessionTargets, statsById, randomOrderById);
    prompts.push(...takeCycled(sessionTargets, broadCount, "broad", statsById));
    prompts.push(...takeCycled(sortedTargets, focusedCount, "focused", statsById));
    prompts.push(...takeCycled(sortedTargets.slice(0, 6), recheckCount, "recheck", statsById));
    return prompts.map((prompt, index) => ({
        ...prompt,
        index,
        miniBatchId: `${prompt.phase}-board`,
    }));
}
export function buildAnswerBoard({ pack, drillMode, targetItems, boardSize }) {
    const correctAnswers = uniqueStrings(targetItems.map((item) => getExpectedAnswer(item, drillMode))).slice(0, boardSize);
    const distractors = maybeShuffle(pack.items
        .map((item) => getExpectedAnswer(item, drillMode))
        .filter((answer) => answer && !correctAnswers.includes(answer)), pack);
    const choices = [...correctAnswers, ...uniqueStrings(distractors).slice(0, boardSize - correctAnswers.length)];
    return pack.domain === "chinese" ? choices.sort(compareAnswers) : shuffleValues(choices);
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
function sortByNeed(items, statsById, randomOrderById) {
    return [...items].sort((a, b) => compareNeedThenRandom(a, b, statsById, randomOrderById));
}
function compareNeedThenRandom(a, b, statsById, randomOrderById) {
    const scoreDifference = (statsById.get(b.id)?.needScore ?? 0) - (statsById.get(a.id)?.needScore ?? 0);
    if (scoreDifference)
        return scoreDifference;
    return (randomOrderById.get(a.id) ?? 0) - (randomOrderById.get(b.id) ?? 0);
}
function uniqueStrings(values) {
    return Array.from(new Set(values));
}
function maybeShuffle(values, pack) {
    return pack.domain === "chinese" ? values : shuffleValues(values);
}
function shuffleItems(items) {
    return shuffleValues(items);
}
function shuffleValues(values) {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
}
function compareAnswers(a, b) {
    const aNumber = Number(a);
    const bNumber = Number(b);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
        return aNumber - bNumber;
    }
    return a.localeCompare(b, "en", { sensitivity: "base" });
}
