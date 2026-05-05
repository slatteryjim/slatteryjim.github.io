const STORE_KEY = "fluency-forge:v1";
const initialState = {
    settings: {
        learnerName: "Alex",
        selectedPackId: "hsk30-band1-characters",
        drillMode: "char_to_pinyin",
        boardSize: 9,
        thresholdMs: 2500,
        timeoutMs: 8000,
        dailyNewLimit: 8,
        sessionLength: 20,
    },
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
    return {
        ...structuredClone(base),
        ...saved,
        settings: {
            ...base.settings,
            ...(saved.settings ?? {}),
        },
        trialEvents: Array.isArray(saved.trialEvents) ? saved.trialEvents : [],
    };
}
