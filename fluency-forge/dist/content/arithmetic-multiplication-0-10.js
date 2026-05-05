const items = [];
for (let left = 0; left <= 10; left += 1) {
    for (let right = 0; right <= 10; right += 1) {
        items.push({
            id: `multiplication-${left}-${right}`,
            type: "generic",
            simplified: `${left} × ${right}`,
            prompt: `${left} × ${right}`,
            answer: String(left * right),
            meanings: [String(left * right)],
            hskLevel: "multiplication-0-10",
            tags: ["arithmetic", "multiplication", "0-10"],
            sourceId: `${left}x${right}`,
        });
    }
}
export const multiplicationFacts0To10 = {
    id: "multiplication-0-10",
    title: "Multiplication Facts 0-10",
    domain: "arithmetic",
    levelLabel: "Multiplication",
    version: "2026-05-04-manual-1",
    sourceName: "Generated arithmetic facts",
    sourceUrls: [],
    license: "Project generated data",
    importedAtIso: "2026-05-04T00:00:00.000Z",
    itemIds: items.map((item) => item.id),
    items,
};
