
export async function performHybridSearch(query: string): Promise<string> {
    try {
        console.log(`[HybridSearch] Searching for: ${query}`);
        const results: string[] = [];

        // 1. Wikipedia Search (Knowledge)
        try {
            const wikiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
            const wikiRes = await fetch(wikiUrl);
            const wikiData = await wikiRes.json();

            if (wikiData.query?.search?.length > 0) {
                const topWiki = wikiData.query.search.slice(0, 2).map((r: any) => r.snippet.replace(/<[^>]*>?/gm, '')).join('. ');
                results.push(`[Wikipedia]: ${topWiki}`);
            }
        } catch (e) {
            console.error("[HybridSearch] Wikipedia error:", e);
        }

        // 2. DuckDuckGo Instant Answer (Facts)
        try {
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            const ddgRes = await fetch(ddgUrl);
            const ddgData = await ddgRes.json();

            if (ddgData.AbstractText) {
                results.push(`[DuckDuckGo]: ${ddgData.AbstractText}`);
            } else if (ddgData.RelatedTopics?.length > 0) {
                // Try to get the first text topic
                const firstTopic = ddgData.RelatedTopics.find((t: any) => t.Text);
                if (firstTopic) {
                    results.push(`[DuckDuckGo]: ${firstTopic.Text}`);
                }
            }
        } catch (e) {
            console.error("[HybridSearch] DuckDuckGo error:", e);
        }

        if (results.length === 0) {
            return "";
        }

        return `\n\nINFORMACIÓN DE BÚSQUEDA (Úsala para responder si es relevante):\n${results.join('\n')}\n`;

    } catch (error) {
        console.error("[HybridSearch] Fatal error:", error);
        return "";
    }
}
