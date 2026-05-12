import { contentPacks, getContentPack } from "./content/index.js";
import { derivePackStats, getTodayEvents } from "./domain/fluency.js";
import { buildAnswerBoard, createSessionPlan, getItemsForBatch } from "./domain/sessionPlanning.js";
import { createTrialEvent, getExpectedAnswer, getPrompt } from "./domain/trials.js";
import { loadState, resetState, saveState } from "./storage/localStore.js";
const AVATAR_OPTIONS = ["字", "妮", "山", "星", "猫", "龙", "舟", "火"];
const app = getRequiredAppRoot();
let state = loadState();
let view = "home";
let activeSession = null;
let profilePickerOpen = false;
render();
function render() {
    const pack = getContentPack(state.settings.selectedPackId);
    normalizeDrillModeForPack(pack);
    const stats = currentStats(pack);
    if (view === "drill" && activeSession && activeSession.index >= activeSession.plan.length) {
        view = "results";
    }
    if (view === "drill" && activeSession) {
        renderDrill(pack);
        return;
    }
    if (view === "results") {
        renderResults(pack, stats);
        return;
    }
    renderHome(pack, stats);
}
function renderHome(pack, stats) {
    app.innerHTML = pageShell(`
    <main class="home-grid">
      <section class="welcome-panel">
        <div class="mascot-badge">字</div>
        <h1>Ready for today's<br><span>5-minute fluency quest?</span></h1>
        <p>Build automatic recognition with quick daily drills.</p>
        <button class="primary-action" data-action="start">Start Session</button>
      </section>

      <section class="stat-stack">
        ${statTile("★", "Fluent", `${stats.fluentCount}`, "items")}
        ${statTile("⚡", "Need Practice", `${stats.buckets.learning + stats.buckets.slow}`, "items")}
        ${statTile("⏱", "Median", formatMs(stats.medianLatencyMs), "response")}
      </section>

      <section class="map-panel">
        <div class="section-title">
          <h2>Content Packs</h2>
          <span>${pack.items.length} items loaded</span>
        </div>
        <div class="pack-row">
          ${contentPacks.map((contentPack) => packCard(contentPack, stats)).join("")}
        </div>
      </section>

      <section class="control-panel">
        <div class="section-title">
          <h2>Today's Drill</h2>
          <span>${modeLabel(state.settings.drillMode)}</span>
        </div>
        <div class="segmented">
          ${availableModesForPack(pack).map(([mode, label]) => modeButton(mode, label)).join("")}
        </div>
      </section>

      <section class="coverage-panel">
        ${coverageBar(stats)}
      </section>
    </main>
  `);
    bindCommonActions();
    app.querySelector("[data-action='start']")?.addEventListener("click", startSession);
    app.querySelectorAll("[data-pack]").forEach((button) => {
        button.addEventListener("click", () => {
            const packId = button.dataset.pack ?? state.settings.selectedPackId;
            updateSettings({
                selectedPackId: packId,
                drillMode: defaultModeForPack(getContentPack(packId)),
            });
        });
    });
    app.querySelectorAll("[data-mode]").forEach((button) => {
        button.addEventListener("click", () => {
            if (isDrillMode(button.dataset.mode)) {
                updateSettings({ drillMode: button.dataset.mode });
            }
        });
    });
}
function renderDrill(pack) {
    if (!activeSession)
        return;
    const entry = activeSession.plan[activeSession.index];
    if (!entry) {
        finishSession();
        return;
    }
    const item = entry.item;
    const answer = getExpectedAnswer(item, state.settings.drillMode);
    const prompt = getPrompt(item);
    const elapsed = Math.max(0, Math.round((performance.now() - activeSession.startedAtMs) / 1000));
    const feedback = activeSession.feedback;
    const roundProgress = getRoundProgress(activeSession.plan, activeSession.index);
    if (activeSession.currentBatchId !== entry.miniBatchId) {
        activeSession.currentBatchId = entry.miniBatchId;
        activeSession.answerBoard = buildAnswerBoard({
            pack,
            drillMode: state.settings.drillMode,
            targetItems: getItemsForBatch(activeSession.plan, activeSession.index),
            boardSize: state.settings.boardSize,
        });
    }
    if (!activeSession.renderedAtMs) {
        activeSession.renderedAtMs = performance.now();
    }
    app.innerHTML = pageShell(`
    <main class="drill-layout">
      <aside class="goal-panel">
        <div class="goal-ring">${activeSession.index + 1}<small>/${activeSession.plan.length}</small></div>
        <h2>${phaseLabel(entry.phase)}</h2>
        <p>Round ${roundProgress.index} of ${roundProgress.total}: ${roundProgress.current}/${roundProgress.count}</p>
        <p>${phaseDescription(entry.phase)}</p>
        <p>${entry.wasNewItem ? "New item" : "Review item"}</p>
      </aside>

      <section class="prompt-card">
        <button
          class="sound-button"
          data-action="speak-prompt"
          data-speech="${escapeAttr(speechText(item, prompt))}"
          data-lang="${speechLang(item)}"
          aria-label="Play prompt audio"
        >▶</button>
        ${promptMarkup(item, pack, prompt)}
        <p>Tap the ${answerLabel(state.settings.drillMode)}</p>
        ${feedback ? feedbackPill(feedback) : ""}
        ${feedback && !feedback.correct ? feedbackDetail(item, feedback) : ""}
      </section>

      <section class="answer-board">
        ${activeSession.answerBoard.map((choice) => answerButton(choice, feedback, answer)).join("")}
      </section>

      <section class="progress-dock">
        <div>
          <strong>Practice Progress</strong>
          <span>${modeLabel(state.settings.drillMode)} · fixed board for this round</span>
        </div>
        <div class="progress-track">
          <span style="width:${((activeSession.index + 1) / activeSession.plan.length) * 100}%"></span>
        </div>
        <div class="timer-pill">⏱ ${formatClock(elapsed)}</div>
      </section>
    </main>
  `);
    bindCommonActions();
    app.querySelectorAll("[data-answer]").forEach((button) => {
        button.addEventListener("click", () => submitAnswer(button.dataset.answer ?? ""));
    });
}
function renderResults(pack, stats) {
    const sessionEvents = activeSession?.events ?? getTodayEvents(relevantEvents(pack));
    const itemsById = new Map(pack.items.map((item) => [item.id, item]));
    const correct = sessionEvents.filter((event) => event.correct).length;
    const wrong = sessionEvents.filter((event) => !event.correct).length;
    const fast = sessionEvents.filter((event) => event.correct && event.latencyMs <= state.settings.thresholdMs).length;
    const slow = sessionEvents.filter((event) => event.correct && event.latencyMs > state.settings.thresholdMs).length;
    const medianLatencyMs = median(sessionEvents.filter((event) => event.correct).map((event) => event.latencyMs));
    const practiced = new Set(sessionEvents.map((event) => event.itemId)).size;
    const sortedCorrect = sessionEvents
        .filter((event) => event.correct && typeof event.latencyMs === "number")
        .sort((a, b) => a.latencyMs - b.latencyMs);
    const fastest = sortedCorrect.slice(0, 6);
    const slowest = [...sortedCorrect].reverse().slice(0, 6);
    const incorrect = sessionEvents.filter((event) => !event.correct).slice(-6);
    app.innerHTML = pageShell(`
    <main class="results-layout">
      <section class="celebration-panel">
        <div class="treasure">★</div>
        <h1>Session complete!</h1>
        <p>You practiced ${practiced} items. Fast means correct under ${formatMs(state.settings.thresholdMs)}.</p>
        <button class="primary-action" data-action="continue">Continue</button>
      </section>

      <section class="results-panel">
        <div class="section-title">
          <h2>Your Results</h2>
          <span>${pack.title}</span>
        </div>
        <div class="result-grid">
          ${resultCard("汉", sessionEvents.length, "attempts")}
          ${resultCard("✓", percent(correct / Math.max(1, sessionEvents.length)), "correct")}
          ${resultCard("⚡", fast, "fast")}
          ${resultCard("…", slow, "slow")}
          ${resultCard("×", wrong, "wrong")}
          ${resultCard("⏱", formatMs(medianLatencyMs), "median")}
          ${resultCard("🔥", computeStreak(), "day streak")}
          ${resultCard("★", percent(fast / Math.max(1, sessionEvents.length)), "fast rate")}
        </div>
        ${coverageBar(stats)}
      </section>

      <section class="session-panel">
        <div class="section-title">
          <h2>Fastest</h2>
          <span>automatic retrieval</span>
        </div>
        <div class="timing-list">${timingList(fastest, itemsById)}</div>
      </section>

      <section class="session-panel">
        <div class="section-title">
          <h2>Slowest</h2>
          <span>good targets for fluency</span>
        </div>
        <div class="timing-list">${timingList(slowest, itemsById)}</div>
      </section>

      <section class="session-panel">
        <div class="section-title">
          <h2>Wrong</h2>
          <span>repair first</span>
        </div>
        <div class="timing-list">${incorrect.length ? timingList(incorrect, itemsById) : "<p>No wrong answers this session.</p>"}</div>
      </section>

      <section class="weak-panel">
        <div class="section-title">
          <h2>Next Practice Targets</h2>
          <span>slow, due, or uncertain</span>
        </div>
        <div class="weak-list">
          ${stats.itemStats
        .filter((itemStats) => itemStats.status !== "unseen")
        .sort((a, b) => b.needScore - a.needScore)
        .slice(0, 8)
        .map((itemStats) => weakItem(itemStats))
        .join("") || "<p>No weak items yet. Start another session to gather more signal.</p>"}
        </div>
      </section>

      <section class="matrix-panel">
        <div class="section-title">
          <h2>${pack.id.includes("characters") ? "HSK1 Character Matrix" : "HSK1 Word Matrix"}</h2>
          <span>${stats.totalItems} items</span>
        </div>
        ${knowledgeMatrix(stats, pack)}
      </section>
    </main>
  `);
    bindCommonActions();
    app.querySelector("[data-action='continue']")?.addEventListener("click", () => {
        activeSession = null;
        profilePickerOpen = false;
        view = "home";
        scrollToTop();
        render();
    });
}
function startSession() {
    const pack = getContentPack(state.settings.selectedPackId);
    const stats = currentStats(pack);
    profilePickerOpen = false;
    activeSession = {
        id: crypto.randomUUID(),
        startedAtMs: performance.now(),
        plan: createSessionPlan({
            pack,
            stats,
            drillMode: state.settings.drillMode,
            settings: state.settings,
        }),
        index: 0,
        events: [],
        answerBoard: [],
        currentBatchId: null,
        renderedAtMs: 0,
        feedback: null,
    };
    view = "drill";
    scrollToTop();
    render();
}
function submitAnswer(selectedAnswer) {
    if (!activeSession)
        return;
    const entry = activeSession.plan[activeSession.index];
    const expectedAnswer = getExpectedAnswer(entry.item, state.settings.drillMode);
    if (activeSession.feedback) {
        if (!activeSession.feedback.correct && selectedAnswer === expectedAnswer) {
            advanceAfterFeedback(260);
        }
        return;
    }
    const event = createTrialEvent({
        learnerId: state.activeLearnerId,
        sessionId: activeSession.id,
        contentPackId: state.settings.selectedPackId,
        item: entry.item,
        drillMode: state.settings.drillMode,
        selectedAnswer,
        answerChoices: activeSession.answerBoard,
        renderedAtMs: activeSession.renderedAtMs,
        submittedAtMs: performance.now(),
        thresholdMs: state.settings.thresholdMs,
        phase: entry.phase,
        miniBatchId: entry.miniBatchId,
        wasNewItem: entry.wasNewItem,
    });
    state.trialEvents.push(event);
    activeSession.events.push(event);
    activeSession.feedback = event;
    saveState(state);
    render();
    if (event.correct) {
        advanceAfterFeedback(520);
    }
}
function advanceAfterFeedback(delayMs) {
    window.setTimeout(() => {
        if (!activeSession)
            return;
        maybeAdaptPlanAfterBroadCheck();
        const nextIndex = activeSession.index + 1;
        if (nextIndex >= activeSession.plan.length) {
            finishSession();
            return;
        }
        activeSession.index = nextIndex;
        activeSession.renderedAtMs = 0;
        activeSession.feedback = null;
        render();
    }, delayMs);
}
function finishSession() {
    if (activeSession) {
        activeSession.completedAtIso = new Date().toISOString();
        activeSession.index = activeSession.plan.length;
        activeSession.feedback = null;
    }
    view = "results";
    scrollToTop();
    render();
}
function maybeAdaptPlanAfterBroadCheck() {
    if (!activeSession)
        return;
    const currentEntry = activeSession.plan[activeSession.index];
    const nextEntry = activeSession.plan[activeSession.index + 1];
    const isEndOfSurveyRound = currentEntry?.phase === "broad" && (!nextEntry || nextEntry.phase !== "broad");
    if (!isEndOfSurveyRound)
        return;
    const weakIds = new Set(activeSession.events
        .filter((event) => event.metadata.phase === "broad" &&
        (!event.correct || event.latencyMs > state.settings.thresholdMs))
        .map((event) => event.itemId));
    const itemById = new Map(activeSession.plan.map((entry) => [entry.item.id, entry.item]));
    const newFlagById = new Map(activeSession.plan.map((entry) => [entry.item.id, entry.wasNewItem]));
    const weakItems = Array.from(weakIds)
        .map((itemId) => itemById.get(itemId))
        .filter((item) => Boolean(item));
    const prefix = activeSession.plan.slice(0, activeSession.index + 1);
    if (weakItems.length === 0) {
        activeSession.plan = prefix.map((entry, index) => ({ ...entry, index }));
        return;
    }
    const focusedCount = Math.min(state.settings.sessionLength, Math.max(weakItems.length * 2, Math.min(state.settings.boardSize, 6)));
    const recheckCount = Math.min(state.settings.boardSize, weakItems.length);
    const focusedEntries = cycleEntries(weakItems, focusedCount, "focused", newFlagById);
    const recheckEntries = cycleEntries(weakItems, recheckCount, "recheck", newFlagById);
    activeSession.plan = assignMiniBatchIds([...prefix, ...focusedEntries, ...recheckEntries], state.settings.boardSize);
}
function updateSettings(nextSettings) {
    state.settings = { ...state.settings, ...nextSettings };
    normalizeDrillModeForPack(getContentPack(state.settings.selectedPackId));
    saveState(state);
    render();
}
function currentStats(pack) {
    return derivePackStats(pack.items, relevantEvents(pack), state.settings.drillMode, state.settings.thresholdMs);
}
function relevantEvents(pack) {
    return state.trialEvents.filter((event) => event.contentPackId === pack.id && event.learnerId === state.activeLearnerId);
}
function pageShell(content) {
    const learner = activeLearner();
    return `
    <div class="app-shell view-${view}">
      <header class="top-bar">
        <button class="brand" data-action="home" aria-label="Home">
          <span>Fluency</span><strong>Forge</strong>
        </button>
        <button class="profile-chip" data-action="profile" aria-label="Learner profile">
          <span>${escapeHtml(learner.avatar)}</span>${escapeHtml(learner.name)}
        </button>
        <div class="streak-chip">🔥 ${computeStreak()} day streak</div>
        <button class="ghost-button" data-action="results">Results</button>
        <button class="ghost-button" data-action="export">Export</button>
        <button class="ghost-button" data-action="import">Import</button>
        <button class="ghost-button" data-action="reset">Reset</button>
        <input class="hidden-input" type="file" accept="application/json" data-role="import-file">
      </header>
      ${profilePickerOpen ? profilePanelMarkup() : ""}
      ${content}
    </div>
  `;
}
function bindCommonActions() {
    app.querySelectorAll("[data-action='home']").forEach((button) => {
        button.addEventListener("click", () => {
            view = "home";
            scrollToTop();
            render();
        });
    });
    app.querySelectorAll("[data-action='results']").forEach((button) => {
        button.addEventListener("click", () => {
            view = "results";
            scrollToTop();
            render();
        });
    });
    app.querySelectorAll("[data-action='profile']").forEach((button) => {
        button.addEventListener("click", () => {
            if (view === "drill" && activeSession) {
                alert("Finish this session before switching learners.");
                return;
            }
            profilePickerOpen = !profilePickerOpen;
            render();
        });
    });
    app.querySelectorAll("[data-action='close-profile']").forEach((button) => {
        button.addEventListener("click", () => {
            profilePickerOpen = false;
            render();
        });
    });
    app.querySelectorAll("[data-learner-id]").forEach((button) => {
        button.addEventListener("click", () => {
            const learnerId = button.dataset.learnerId;
            if (learnerId)
                switchLearner(learnerId);
        });
    });
    app.querySelector("[data-role='profile-name']")?.addEventListener("change", (event) => {
        const value = event.currentTarget.value;
        updateActiveLearner({ name: value || "Learner" });
    });
    app.querySelectorAll("[data-avatar]").forEach((button) => {
        button.addEventListener("click", () => {
            const avatar = button.dataset.avatar;
            if (avatar)
                updateActiveLearner({ avatar });
        });
    });
    app.querySelectorAll("[data-action='add-learner']").forEach((button) => {
        button.addEventListener("click", addLearner);
    });
    app.querySelectorAll("[data-action='reset']").forEach((button) => {
        button.addEventListener("click", () => {
            if (!confirm("Clear all local Fluency Forge progress?"))
                return;
            resetState();
            state = loadState();
            activeSession = null;
            profilePickerOpen = false;
            view = "home";
            scrollToTop();
            render();
        });
    });
    app.querySelectorAll("[data-action='export']").forEach((button) => {
        button.addEventListener("click", exportProgress);
    });
    app.querySelectorAll("[data-action='import']").forEach((button) => {
        button.addEventListener("click", () => {
            app.querySelector("[data-role='import-file']")?.click();
        });
    });
    app.querySelectorAll("[data-role='import-file']").forEach((input) => {
        input.addEventListener("change", () => {
            const file = input.files?.[0];
            input.value = "";
            if (file)
                void importProgress(file);
        });
    });
    app.querySelectorAll("[data-action='speak-prompt']").forEach((button) => {
        button.addEventListener("click", () => speakText(button.dataset.speech ?? "", button.dataset.lang ?? "en-US"));
    });
}
function exportProgress() {
    const backup = {
        exportedAtIso: new Date().toISOString(),
        appVersion: "0.1.0",
        state,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fluency-forge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
}
async function importProgress(file) {
    try {
        const parsed = JSON.parse(await file.text());
        const importedState = extractImportedState(parsed);
        if (!importedState) {
            alert("That file does not look like a Fluency Forge backup.");
            return;
        }
        state = importedState;
        activeSession = null;
        profilePickerOpen = false;
        view = "home";
        saveState(state);
        scrollToTop();
        render();
    }
    catch (error) {
        console.error(error);
        alert("Could not import that backup file.");
    }
}
function extractImportedState(value) {
    if (!value || typeof value !== "object")
        return null;
    const candidate = "state" in value ? value.state : value;
    if (!candidate || typeof candidate !== "object")
        return null;
    const maybeState = candidate;
    if (!maybeState.settings || !Array.isArray(maybeState.trialEvents))
        return null;
    const learners = sanitizeImportedLearners(maybeState);
    const activeLearnerId = learners.some((learner) => learner.id === maybeState.activeLearnerId)
        ? maybeState.activeLearnerId
        : learners[0].id;
    return {
        settings: {
            ...state.settings,
            ...maybeState.settings,
            drillMode: isDrillMode(maybeState.settings.drillMode)
                ? maybeState.settings.drillMode
                : state.settings.drillMode,
        },
        learners,
        activeLearnerId,
        trialEvents: maybeState.trialEvents,
    };
}
function activeLearner() {
    return state.learners.find((learner) => learner.id === state.activeLearnerId) ?? state.learners[0];
}
function updateActiveLearner(next) {
    const learner = activeLearner();
    state.learners = state.learners.map((entry) => entry.id === learner.id
        ? {
            ...entry,
            ...next,
            name: typeof next.name === "string" ? next.name.trim() || entry.name : entry.name,
        }
        : entry);
    saveState(state);
    render();
}
function switchLearner(learnerId) {
    if (!state.learners.some((learner) => learner.id === learnerId))
        return;
    state.activeLearnerId = learnerId;
    activeSession = null;
    profilePickerOpen = false;
    view = "home";
    saveState(state);
    scrollToTop();
    render();
}
function addLearner() {
    const learnerNumber = state.learners.length + 1;
    const learner = {
        id: crypto.randomUUID(),
        name: `Learner ${learnerNumber}`,
        avatar: AVATAR_OPTIONS[(learnerNumber - 1) % AVATAR_OPTIONS.length],
    };
    state.learners = [...state.learners, learner];
    state.activeLearnerId = learner.id;
    saveState(state);
    render();
}
function profilePanelMarkup() {
    const learner = activeLearner();
    return `
    <section class="profile-panel">
      <div class="profile-panel-header">
        <div>
          <h2>Learners</h2>
          <p>Switch profiles or personalize this learner.</p>
        </div>
        <button class="ghost-button profile-close" data-action="close-profile">Close</button>
      </div>
      <div class="profile-learner-list">
        ${state.learners.map((entry) => `
          <button class="learner-pill ${entry.id === learner.id ? "active" : ""}" data-learner-id="${entry.id}">
            <span>${escapeHtml(entry.avatar)}</span>
            <strong>${escapeHtml(entry.name)}</strong>
          </button>
        `).join("")}
        <button class="learner-pill add" data-action="add-learner">
          <span>+</span>
          <strong>Add learner</strong>
        </button>
      </div>
      <label class="profile-field">
        <span>Name</span>
        <input type="text" value="${escapeAttr(learner.name)}" data-role="profile-name" maxlength="24">
      </label>
      <div class="profile-field">
        <span>Avatar</span>
        <div class="avatar-grid">
          ${AVATAR_OPTIONS.map((avatar) => `
            <button class="avatar-option ${avatar === learner.avatar ? "active" : ""}" data-avatar="${escapeAttr(avatar)}">
              ${escapeHtml(avatar)}
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}
function sanitizeImportedLearners(maybeState) {
    if (Array.isArray(maybeState.learners) && maybeState.learners.length > 0) {
        const learners = maybeState.learners
            .filter((entry) => Boolean(entry && typeof entry.id === "string" && typeof entry.name === "string" && typeof entry.avatar === "string"))
            .map((entry) => ({
            id: entry.id,
            name: entry.name.trim() || "Learner",
            avatar: entry.avatar.trim() || "字",
        }));
        if (learners.length > 0)
            return learners;
    }
    const legacyName = typeof maybeState.settings?.learnerName === "string"
        ? (maybeState.settings.learnerName?.trim() || "Alex")
        : "Alex";
    return [{ id: "default", name: legacyName, avatar: "字" }];
}
function packCard(pack, stats) {
    const selected = pack.id === state.settings.selectedPackId;
    return `
    <button class="pack-card ${selected ? "selected" : ""}" data-pack="${pack.id}">
      <span class="pack-flag">${packIcon(pack)}</span>
      <strong>${packTitle(pack)}</strong>
      <small>${selected ? `${stats.fluentCount} fluent` : `${pack.items.length} items`}</small>
    </button>
  `;
}
function modeButton(mode, label) {
    return `
    <button class="${state.settings.drillMode === mode ? "active" : ""}" data-mode="${mode}">
      ${label}
    </button>
  `;
}
function statTile(icon, title, value, label) {
    return `
    <article class="stat-tile">
      <span>${icon}</span>
      <div><strong>${value}</strong><small>${title}<br>${label}</small></div>
    </article>
  `;
}
function resultCard(icon, value, label) {
    return `
    <article class="result-card">
      <span>${icon}</span>
      <strong>${value}</strong>
      <small>${label}</small>
    </article>
  `;
}
function timingList(events, itemsById) {
    if (!events.length)
        return "<p>No timing data yet.</p>";
    return events.map((event) => {
        const item = itemsById.get(event.itemId);
        const tone = !event.correct ? "wrong" : event.latencyMs <= state.settings.thresholdMs ? "fast" : "slow";
        return `
      <div class="timing-row ${tone}">
        <strong>${escapeHtml(item?.simplified ?? event.promptText)}</strong>
        <span>${escapeHtml(event.expectedAnswer)}</span>
        <small>${event.correct ? formatMs(event.latencyMs) : `picked ${escapeHtml(event.selectedAnswer)}`}</small>
      </div>
    `;
    }).join("");
}
function coverageBar(stats) {
    const total = Math.max(1, stats.totalItems);
    const parts = [
        ["unseen", "Unseen", stats.buckets.unseen],
        ["learning", "Learning", stats.buckets.learning],
        ["slow", "Slow", stats.buckets.slow],
        ["fluent", "Fluent Today", stats.buckets.fluentToday],
        ["stable", "Stable", stats.buckets.stableFluent],
    ];
    return `
    <div class="section-title">
      <h2>Coverage</h2>
      <span>${percent(stats.coverageRate)} overall</span>
    </div>
    <div class="coverage-bar">
      ${parts.map(([key, , count]) => `<span class="${key}" style="width:${(count / total) * 100}%"></span>`).join("")}
    </div>
    <div class="coverage-legend">
      ${parts.map(([key, label, count]) => `
        <div><span class="dot ${key}"></span><strong>${count}</strong><small>${label}</small></div>
      `).join("")}
    </div>
  `;
}
function answerButton(choice, feedback, expectedAnswer) {
    const selected = feedback?.selectedAnswer === choice;
    const correct = choice === expectedAnswer;
    const className = feedback
        ? correct ? "correct" : selected ? "wrong" : "muted"
        : "";
    const locked = feedback?.correct ? "disabled" : "";
    return `
    <button class="${className} ${answerSizeClass(choice)}" data-answer="${escapeAttr(choice)}" ${locked}>
      <span class="answer-label">${answerLabelMarkup(choice)}</span>
    </button>
  `;
}
function feedbackPill(feedback) {
    const label = feedback.correct
        ? feedback.latencyMs <= state.settings.thresholdMs ? "Fast!" : "Correct"
        : "Tap the correct answer";
    return `<div class="feedback-pill ${feedback.correct ? "good" : "bad"}">${label} ${formatMs(feedback.latencyMs)}</div>`;
}
function feedbackDetail(item, feedback) {
    const meaning = item.meanings?.slice(0, 2).join("; ");
    const pinyin = item.type === "character"
        ? item.pinyin.join(", ")
        : item.type === "word"
            ? item.pinyin
            : "";
    const details = [
        pinyin && pinyin !== feedback.expectedAnswer ? pinyin : "",
        meaning && meaning !== feedback.expectedAnswer ? meaning : "",
    ].filter(Boolean);
    return `
    <div class="feedback-detail">
      <span>Correct answer</span>
      <strong>${escapeHtml(feedback.expectedAnswer)}</strong>
      ${details.map((detail) => `<small>${escapeHtml(detail)}</small>`).join("")}
      ${exampleWordsMarkup(item)}
    </div>
  `;
}
function exampleWordsMarkup(item) {
    if (item.type !== "character" || !item.exampleWords?.length)
        return "";
    return `
    <div class="feedback-examples" aria-label="Example words">
      ${item.exampleWords.slice(0, 5).map((word) => `<span>${escapeHtml(word)}</span>`).join("")}
    </div>
  `;
}
function speechText(item, prompt) {
    if (item.type === "generic")
        return item.display ?? item.prompt;
    return item.simplified || prompt;
}
function speechLang(item) {
    return item.type === "character" || item.type === "word" ? "zh-CN" : "en-US";
}
function speakText(text, lang) {
    if (!text || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined")
        return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang.startsWith("zh") ? 0.82 : 0.95;
    window.speechSynthesis.speak(utterance);
}
function answerLabelMarkup(choice) {
    return choice
        .split(/(\s+)/)
        .map((part) => {
        if (!part.trim())
            return escapeHtml(part);
        return `<span class="answer-token">${escapeHtml(part)}</span>`;
    })
        .join("");
}
function answerSizeClass(choice) {
    const longestToken = choice
        .split(/\s+/)
        .reduce((longest, token) => Math.max(longest, Array.from(token).length), 0);
    const totalLength = Array.from(choice.replace(/\s+/g, "")).length;
    const size = Math.max(longestToken, Math.ceil(totalLength / 1.6));
    if (size <= 3)
        return "answer-size-short";
    if (size <= 5)
        return "answer-size-medium";
    if (size <= 8)
        return "answer-size-long";
    return "answer-size-xlong";
}
function weakItem(itemStats) {
    return `
    <div class="weak-item">
      <strong>${escapeHtml(itemStats.item.simplified)}</strong>
      <span>${escapeHtml(getExpectedAnswer(itemStats.item, state.settings.drillMode))}</span>
      <small>${itemStats.status.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</small>
    </div>
  `;
}
function knowledgeMatrix(stats, pack) {
    const isCharacters = pack.id.includes("characters");
    const matrixClass = isCharacters ? "character-grid" : pack.domain === "chinese" ? "word-grid" : "generic-grid";
    return `
    <div class="matrix-legend">
      <span><i class="dot unseen"></i>Unlearned</span>
      <span><i class="dot learning"></i>Wrong / learning</span>
      <span><i class="dot slow"></i>Learned but slow</span>
      <span><i class="dot fluentToday"></i>Fluent today</span>
      <span><i class="dot stableFluent"></i>Stable fluent</span>
    </div>
    <div class="knowledge-grid ${matrixClass}">
      ${stats.itemStats.map((itemStats) => `
        <div
          class="knowledge-cell ${itemStats.status}"
          title="${escapeAttr(`${itemStats.item.simplified}: ${statusLabel(itemStats.status)} (${itemStats.attempts} attempts)`)}"
        >
          ${escapeHtml(matrixLabel(itemStats.item))}
        </div>
      `).join("")}
    </div>
  `;
}
function statusLabel(status) {
    return {
        unseen: "unlearned",
        learning: "wrong / learning",
        slow: "learned but slow",
        fluentToday: "fluent today",
        stableFluent: "stable fluent",
    }[status] ?? status;
}
function phaseLabel(phase) {
    return {
        broad: "Survey",
        focused: "Review",
        recheck: "Drill",
    }[phase] ?? "Practice";
}
function phaseDescription(phase) {
    return {
        broad: "Show each card once to find what is weak.",
        focused: "Repair the cards that were wrong or slow.",
        recheck: "Retest the repaired cards after a short delay.",
    }[phase] ?? "Practice";
}
function getRoundProgress(plan, currentIndex) {
    const phases = Array.from(new Set(plan.map((entry) => entry.phase)));
    const phase = plan[currentIndex]?.phase ?? phases[0];
    const phaseEntries = plan.filter((entry) => entry.phase === phase);
    return {
        index: phases.indexOf(phase) + 1,
        total: phases.length,
        current: phaseEntries.findIndex((entry) => entry.index === currentIndex) + 1,
        count: phaseEntries.length,
    };
}
function cycleEntries(items, count, phase, newFlagById) {
    if (items.length === 0 || count <= 0)
        return [];
    return Array.from({ length: count }, (_, offset) => {
        const item = items[offset % items.length];
        return {
            item,
            phase,
            wasNewItem: newFlagById.get(item.id) ?? false,
        };
    });
}
function assignMiniBatchIds(prompts, boardSize) {
    const safeBoardSize = Math.max(1, boardSize);
    const phaseCounts = new Map();
    return prompts.map((prompt, index) => {
        const phaseOffset = phaseCounts.get(prompt.phase) ?? 0;
        phaseCounts.set(prompt.phase, phaseOffset + 1);
        const batchIndex = Math.floor(phaseOffset / safeBoardSize) + 1;
        return {
            ...prompt,
            index,
            miniBatchId: `${prompt.phase}-board-${batchIndex}`,
        };
    });
}
function modeLabel(mode) {
    return {
        char_to_pinyin: "Character → pinyin",
        char_to_meaning: "Character → meaning",
        word_to_pinyin: "Word → pinyin",
        word_to_meaning: "Word → meaning",
        prompt_to_answer: "Prompt → answer",
    }[mode];
}
function availableModesForPack(pack) {
    if (pack.domain && pack.domain !== "chinese") {
        return [["prompt_to_answer", "Prompt → answer"]];
    }
    return pack.id.includes("words")
        ? [
            ["word_to_pinyin", "词 → pinyin"],
            ["word_to_meaning", "词 → meaning"],
        ]
        : [
            ["char_to_pinyin", "字 → pinyin"],
            ["char_to_meaning", "字 → meaning"],
        ];
}
function normalizeDrillModeForPack(pack) {
    const availableModes = availableModesForPack(pack).map(([mode]) => mode);
    if (!availableModes.includes(state.settings.drillMode)) {
        state.settings.drillMode = availableModes[0];
        saveState(state);
    }
}
function defaultModeForPack(pack) {
    return availableModesForPack(pack)[0][0];
}
function answerLabel(mode) {
    if (mode.endsWith("_to_pinyin"))
        return "pinyin";
    if (mode.endsWith("_to_meaning"))
        return "meaning";
    return "answer";
}
function packIcon(pack) {
    if (pack.domain === "arithmetic")
        return pack.id.includes("multiplication") ? "×" : "+";
    if (pack.domain === "music")
        return "♪";
    return pack.id.includes("words") ? "词" : "字";
}
function packTitle(pack) {
    if (pack.domain === "arithmetic" || pack.domain === "music")
        return pack.title;
    return pack.id.includes("words") ? "Level 2: HSK1 Words" : "Level 1: HSK1 Characters";
}
function matrixLabel(item) {
    if (item.type === "generic")
        return item.display ?? item.simplified;
    return item.simplified;
}
function promptMarkup(item, pack, prompt) {
    if (pack.domain === "music" && item.type === "generic") {
        return staffPromptMarkup(item);
    }
    return `<div class="prompt-text ${pack.domain ? `domain-${pack.domain}` : ""}">${escapeHtml(prompt)}</div>`;
}
function staffPromptMarkup(item) {
    const note = staffNoteData(item.sourceId ?? "");
    const staffLines = [60, 78, 96, 114, 132];
    const ledgerLines = ledgerLineYs(note.step, note.y);
    const stemUp = note.step < 4;
    const stemX = stemUp ? note.x + 10 : note.x - 10;
    const stemEndY = stemUp ? note.y - 55 : note.y + 55;
    return `
    <div class="staff-prompt" aria-label="${escapeAttr(getPrompt(item))}">
      <span class="staff-title">${note.clef === "bass" ? "Bass clef" : "Treble clef"}</span>
      <svg class="staff-svg" viewBox="0 0 420 220" role="img" aria-label="${escapeAttr(getPrompt(item))}">
        <g class="staff-rule-group">
          ${staffLines.map((y) => `<line x1="58" y1="${y}" x2="372" y2="${y}"></line>`).join("")}
        </g>
        ${clefMarkup(note.clef)}
        <g class="ledger-group">
          ${ledgerLines.map((y) => `<line x1="${note.x - 24}" y1="${y}" x2="${note.x + 24}" y2="${y}"></line>`).join("")}
        </g>
        <g class="note-mark" data-note-step="${note.step}">
          <line class="note-stem" x1="${stemX}" y1="${note.y}" x2="${stemX}" y2="${stemEndY}"></line>
          <ellipse class="note-head" cx="${note.x}" cy="${note.y}" rx="13" ry="8.6" transform="rotate(-18 ${note.x} ${note.y})"></ellipse>
        </g>
      </svg>
    </div>
  `;
}
function clefMarkup(clef) {
    if (clef === "bass") {
        return `<text class="staff-clef staff-clef-bass" x="52" y="123" aria-hidden="true">𝄢</text>`;
    }
    return `<text class="staff-clef staff-clef-treble" x="38" y="128" aria-hidden="true">𝄞</text>`;
}
function staffNoteData(sourceId) {
    const match = sourceId.match(/^(treble|bass)-([a-g])(\d)$/);
    const clef = match?.[1] === "bass" ? "bass" : "treble";
    const letter = (match?.[2] ?? (clef === "bass" ? "d" : "b")).toUpperCase();
    const octave = Number(match?.[3] ?? (clef === "bass" ? "3" : "4"));
    const baseStep = clef === "bass" ? noteOrdinal("G", 2) : noteOrdinal("E", 4);
    const step = noteOrdinal(letter, octave) - baseStep;
    return {
        clef,
        step,
        x: 258,
        y: 132 - step * 9,
    };
}
function noteOrdinal(letter, octave) {
    const letterIndex = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
    return octave * 7 + (letterIndex[letter] ?? 0);
}
function ledgerLineYs(step, noteY) {
    const lines = [];
    if (step <= -2) {
        for (let ledgerStep = -2; ledgerStep >= step; ledgerStep -= 2) {
            lines.push(132 - ledgerStep * 9);
        }
    }
    if (step >= 10) {
        for (let ledgerStep = 10; ledgerStep <= step; ledgerStep += 2) {
            lines.push(132 - ledgerStep * 9);
        }
    }
    return lines.filter((y) => Math.abs(y - noteY) < 56);
}
function computeStreak() {
    const days = new Set(state.trialEvents
        .filter((event) => event.learnerId === state.activeLearnerId)
        .map((event) => event.createdAtIso.slice(0, 10)));
    if (days.size === 0)
        return 0;
    let streak = 0;
    const date = new Date();
    while (days.has(date.toISOString().slice(0, 10))) {
        streak += 1;
        date.setDate(date.getDate() - 1);
    }
    return streak;
}
function formatMs(ms) {
    if (!ms && ms !== 0)
        return "—";
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
function formatClock(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
function percent(value) {
    return `${Math.round(value * 100)}%`;
}
function median(values) {
    const sorted = values.filter((value) => typeof value === "number").sort((a, b) => a - b);
    if (!sorted.length)
        return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function escapeAttr(value) {
    return escapeHtml(value).replaceAll("\n", " ");
}
function getRequiredAppRoot() {
    const root = document.querySelector("#app");
    if (!root) {
        throw new Error("Missing #app root element");
    }
    return root;
}
function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
function isDrillMode(value) {
    return (value === "char_to_pinyin" ||
        value === "char_to_meaning" ||
        value === "word_to_pinyin" ||
        value === "word_to_meaning" ||
        value === "prompt_to_answer");
}
