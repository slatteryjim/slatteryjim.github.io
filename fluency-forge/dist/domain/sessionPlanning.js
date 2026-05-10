import { getExpectedAnswer, isModeCompatible } from "./trials.js";
export function createSessionPlan({ pack, stats, drillMode, settings }) {
    const compatibleItems = pack.items.filter((item) => isModeCompatible(item, drillMode));
    const candidateItems = shuffleItems(compatibleItems);
    const randomOrderById = new Map(candidateItems.map((item, index) => [item.id, index]));
    const statsById = new Map(stats.itemStats.map((itemStats) => [itemStats.item.id, itemStats]));
    const unseen = candidateItems.filter((item) => statsById.get(item.id)?.status === "unseen");
    const dueOrWeak = candidateItems
        .filter((item) => {
        const itemStats = statsById.get(item.id);
        if (!itemStats || itemStats.status === "unseen")
            return false;
        const isDue = Date.parse(itemStats.dueAtIso) <= Date.now();
        return isDue || itemStats.status === "learning" || itemStats.status === "slow" || itemStats.needScore > 0;
    })
        .sort((a, b) => compareNeedThenRandom(a, b, statsById, randomOrderById));
    const fallbackReview = candidateItems
        .filter((item) => (statsById.get(item.id)?.attempts ?? 0) > 0 && !dueOrWeak.includes(item))
        .sort((a, b) => compareNeedThenRandom(a, b, statsById, randomOrderById));
    const prompts = [];
    const broadCount = Math.min(settings.sessionLength, candidateItems.length);
    const reviewCap = unseen.length
        ? Math.min(dueOrWeak.length, Math.max(2, Math.floor(broadCount / 4)))
        : Math.min(dueOrWeak.length, broadCount);
    let unseenCursor = 0;
    const takeUnseen = (count) => {
        if (count <= 0)
            return [];
        const nextItems = unseen.slice(unseenCursor, unseenCursor + count);
        unseenCursor += nextItems.length;
        return nextItems;
    };
    const broadItems = fillTargetSet([
        ...dueOrWeak.slice(0, reviewCap),
        ...takeUnseen(Math.max(0, broadCount - reviewCap)),
    ], broadCount, [...dueOrWeak, ...fallbackReview, ...candidateItems]);
    prompts.push(...takeUnique(broadItems, broadCount, "broad", statsById));
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
    const choices = [...correctAnswers, ...uniqueStrings(distractors).slice(0, boardSize - correctAnswers.length)];
    return choices.sort(compareAnswers);
}
export function getItemsForBatch(plan, currentIndex) {
    const current = plan[currentIndex];
    if (!current)
        return [];
    return plan
        .filter((entry) => entry.miniBatchId === current.miniBatchId)
        .map((entry) => entry.item);
}
function takeUnique(items, count, phase, statsById) {
    if (!items.length || count <= 0)
        return [];
    return items.slice(0, count).map((item) => ({
        item,
        phase,
        wasNewItem: (statsById.get(item.id)?.attempts ?? 0) === 0,
    }));
}
function uniqueItems(items) {
    return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
function fillTargetSet(baseItems, targetSize, fallbackItems) {
    if (targetSize <= 0)
        return [];
    return uniqueItems([...baseItems, ...fallbackItems]).slice(0, targetSize);
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
