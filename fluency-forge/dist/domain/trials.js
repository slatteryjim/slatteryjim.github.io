export function getPrompt(item) {
    if (item.type === "generic")
        return item.prompt;
    return item.simplified;
}
export function getExpectedAnswer(item, drillMode) {
    if (drillMode === "prompt_to_answer" && item.type === "generic") {
        return item.answer;
    }
    if (drillMode.endsWith("_to_pinyin") && (item.type === "character" || item.type === "word")) {
        return Array.isArray(item.pinyin) ? item.pinyin[0] : item.pinyin;
    }
    return item.meanings?.[0] ?? "unknown";
}
export function isModeCompatible(item, drillMode) {
    if (item.type === "generic")
        return drillMode === "prompt_to_answer";
    if (item.type === "character" && !drillMode.startsWith("char_"))
        return false;
    if (item.type === "word" && !drillMode.startsWith("word_"))
        return false;
    return Boolean(getExpectedAnswer(item, drillMode));
}
export function createTrialEvent({ learnerId = "default", sessionId, contentPackId, item, drillMode, selectedAnswer, answerChoices, renderedAtMs, submittedAtMs, thresholdMs, phase, miniBatchId, wasNewItem = false, }) {
    const expectedAnswer = getExpectedAnswer(item, drillMode);
    const correct = selectedAnswer === expectedAnswer;
    return {
        id: crypto.randomUUID(),
        learnerId,
        sessionId,
        contentPackId,
        itemId: item.id,
        drillMode,
        promptText: getPrompt(item),
        expectedAnswer,
        selectedAnswer,
        answerChoices,
        answerChoicePositions: Object.fromEntries(answerChoices.map((choice, index) => [choice, index])),
        inputMethod: "fixed_choice_board",
        renderedAtMs,
        firstInteractionAtMs: submittedAtMs,
        submittedAtMs,
        latencyMs: Math.round(submittedAtMs - renderedAtMs),
        correct,
        timeout: false,
        appVersion: "0.1.0",
        thresholdConfigId: `fixed-${thresholdMs}ms`,
        createdAtIso: new Date().toISOString(),
        metadata: {
            phase,
            miniBatchId,
            wasNewItem,
            wasReviewItem: !wasNewItem,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
    };
}
