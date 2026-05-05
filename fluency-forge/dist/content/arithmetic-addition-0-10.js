const items = [];
for (let left = 0; left <= 10; left += 1) {
    for (let right = 0; right <= 10; right += 1) {
        items.push({
            id: `addition-${left}-${right}`,
            type: "generic",
            simplified: `${left} + ${right}`,
            prompt: `${left} + ${right}`,
            answer: String(left + right),
            meanings: [String(left + right)],
            hskLevel: "addition-0-10",
            tags: ["arithmetic", "addition", "0-10"],
            sourceId: `${left}+${right}`,
        });
    }
}
export const additionFacts0To10 = {
    id: "addition-0-10",
    title: "Addition Facts 0-10",
    domain: "arithmetic",
    levelLabel: "Addition",
    version: "2026-05-04-manual-1",
    sourceName: "Generated arithmetic facts",
    sourceUrls: [],
    license: "Project generated data",
    importedAtIso: "2026-05-04T00:00:00.000Z",
    itemIds: items.map((item) => item.id),
    items,
};
