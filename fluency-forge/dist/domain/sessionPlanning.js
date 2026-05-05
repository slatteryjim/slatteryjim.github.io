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
    const broadCount = Math.min(8, settings.sessionLength);
    const focusedCount = Math.max(0, settings.sessionLength - broadCount - 4);
    const recheckCount = Math.max(0, settings.sessionLength - broadCount - focusedCount);
    const reviewCap = unseen.length
        ? Math.min(dueOrWeak.length, Math.max(1, Math.floor(settings.boardSize / 3)))
        : Math.min(dueOrWeak.length, settings.boardSize);
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
        ...takeUnseen(Math.max(0, Math.min(settings.boardSize, broadCount) - reviewCap)),
    ], Math.min(settings.boardSize, broadCount), [...dueOrWeak, ...fallbackReview, ...candidateItems]);
    const focusedBase = dueOrWeak.length
        ? [...dueOrWeak, ...takeUnseen(Math.max(0, Math.min(settings.boardSize, focusedCount) - dueOrWeak.length))]
        : takeUnseen(Math.min(settings.boardSize, focusedCount));
    const focusedItems = fillTargetSet(sortByNeed(focusedBase, statsById, randomOrderById), Math.min(settings.boardSize, focusedCount), [...dueOrWeak, ...fallbackReview, ...candidateItems]);
    const recheckBase = dueOrWeak.length
        ? [...dueOrWeak.slice(0, Math.min(6, settings.boardSize)), ...takeUnseen(Math.max(0, recheckCount))]
        : takeUnseen(Math.min(settings.boardSize, recheckCount));
    const recheckItems = fillTargetSet(sortByNeed(recheckBase, statsById, randomOrderById), Math.min(settings.boardSize, recheckCount), [...dueOrWeak, ...fallbackReview, ...candidateItems]);
    prompts.push(...takeCycled(broadItems, broadCount, "broad", statsById));
    prompts.push(...takeCycled(focusedItems, focusedCount, "focused", statsById));
    prompts.push(...takeCycled(recheckItems, recheckCount, "recheck", statsById));
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
function fillTargetSet(baseItems, targetSize, fallbackItems) {
    if (targetSize <= 0)
        return [];
    return uniqueItems([...baseItems, ...fallbackItems]).slice(0, targetSize);
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
