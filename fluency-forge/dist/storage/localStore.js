const STORE_KEY = "fluency-forge:v1";
const DEFAULT_LEARNER_ID = "default";
const DEFAULT_LEARNER_AVATAR = "字";
const initialState = {
    settings: {
        selectedPackId: "hsk30-band1-characters",
        drillMode: "char_to_pinyin",
        boardSize: 9,
        thresholdMs: 2500,
        timeoutMs: 8000,
        dailyNewLimit: 8,
        sessionLength: 20,
    },
    learners: [{ id: DEFAULT_LEARNER_ID, name: "Alex", avatar: DEFAULT_LEARNER_AVATAR }],
    activeLearnerId: DEFAULT_LEARNER_ID,
    trialEvents: [],
};
export function loadState() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw)
            return structuredClone(initialState);
        return mergeState(initialState, JSON.parse(raw));
    }
    catch (error) {
        console.warn("Could not load saved state", error);
        return structuredClone(initialState);
    }
}
export function saveState(state) {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
}
export function resetState() {
    localStorage.removeItem(STORE_KEY);
}
function mergeState(base, saved) {
    const legacyName = extractLegacyLearnerName(saved);
    const savedLearners = sanitizeLearners(saved.learners);
    const learners = savedLearners.length
        ? savedLearners
        : [{ id: DEFAULT_LEARNER_ID, name: legacyName || base.learners[0].name, avatar: DEFAULT_LEARNER_AVATAR }];
    const activeLearnerId = learners.some((learner) => learner.id === saved.activeLearnerId)
        ? saved.activeLearnerId
        : learners[0].id;
    return {
        ...structuredClone(base),
        ...saved,
        settings: {
            ...base.settings,
            ...(saved.settings ?? {}),
        },
        learners,
        activeLearnerId,
        trialEvents: Array.isArray(saved.trialEvents) ? saved.trialEvents : [],
    };
}
function sanitizeLearners(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry, index) => {
        if (!entry || typeof entry !== "object")
            return null;
        const learner = entry;
        const id = typeof learner.id === "string" && learner.id ? learner.id : `learner-${index + 1}`;
        const name = typeof learner.name === "string" && learner.name.trim() ? learner.name.trim() : `Learner ${index + 1}`;
        const avatar = typeof learner.avatar === "string" && learner.avatar.trim() ? learner.avatar.trim() : DEFAULT_LEARNER_AVATAR;
        return { id, name, avatar };
    })
        .filter((learner) => Boolean(learner));
}
function extractLegacyLearnerName(saved) {
    const settings = saved.settings;
    return typeof settings?.learnerName === "string" ? settings.learnerName.trim() : "";
}
