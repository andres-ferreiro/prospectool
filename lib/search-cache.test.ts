import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readCachedSearch,
  writeCachedSearch,
  clearCachedSearch,
  readCachedAdvancedSearch,
  writeCachedAdvancedSearch,
  clearCachedAdvancedSearch,
} from "./search-cache";

// This project's vitest environment is "node" — no window/localStorage by
// default — so a minimal in-memory stand-in is enough to exercise the real
// read/write/TTL logic without pulling in jsdom.
function fakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: fakeLocalStorage() });
});

describe("advanced search cache", () => {
  it("round-trips results, per-business code matches, and the code list", () => {
    writeCachedAdvancedSearch("project-1", {
      results: [{ id: "b1" } as never],
      resultCodeEntries: [["b1", ["461110", "461121"]]],
      codes: ["461110", "461121"],
    });

    const cached = readCachedAdvancedSearch("project-1");
    expect(cached?.results).toEqual([{ id: "b1" }]);
    expect(cached?.resultCodeEntries).toEqual([["b1", ["461110", "461121"]]]);
    expect(cached?.codes).toEqual(["461110", "461121"]);
  });

  it("expires after the TTL window", () => {
    writeCachedAdvancedSearch("project-1", { results: [], resultCodeEntries: [], codes: ["461110"] });

    // Rewind the write's timestamp to just past the 15-minute TTL instead of
    // depending on real elapsed time.
    const raw = window.localStorage.getItem("lead-finder:search:project-1:advanced");
    const parsed = JSON.parse(raw as string);
    parsed.cachedAt = Date.now() - 16 * 60 * 1000;
    window.localStorage.setItem("lead-finder:search:project-1:advanced", JSON.stringify(parsed));

    expect(readCachedAdvancedSearch("project-1")).toBeNull();
  });

  it("stores advanced results independently of the keyword-search cache", () => {
    // This is the regression this cache exists to prevent: the keyword
    // search's own cache entry (or its absence) must never influence
    // whether advanced-search results are considered present.
    writeCachedAdvancedSearch("project-1", { results: [{ id: "b1" } as never], resultCodeEntries: [], codes: ["461110"] });

    expect(readCachedSearch("project-1")).toBeNull();
    expect(readCachedAdvancedSearch("project-1")?.results).toEqual([{ id: "b1" }]);

    writeCachedSearch("project-1", { businesses: [], keywordEntries: [], center: { lat: 0, lng: 0 }, radiusM: 1500 });

    // Writing the keyword cache afterwards doesn't clobber the advanced one.
    expect(readCachedAdvancedSearch("project-1")?.results).toEqual([{ id: "b1" }]);
  });

  it("clearing the advanced cache leaves the keyword-search cache untouched", () => {
    writeCachedSearch("project-1", {
      businesses: [{ id: "b2" } as never],
      keywordEntries: [],
      center: { lat: 0, lng: 0 },
      radiusM: 1500,
    });
    writeCachedAdvancedSearch("project-1", { results: [{ id: "b1" } as never], resultCodeEntries: [], codes: ["461110"] });

    clearCachedAdvancedSearch("project-1");

    expect(readCachedAdvancedSearch("project-1")).toBeNull();
    expect(readCachedSearch("project-1")?.businesses).toEqual([{ id: "b2" }]);
  });

  it("keeps different projects' advanced results separate", () => {
    writeCachedAdvancedSearch("project-1", { results: [{ id: "b1" } as never], resultCodeEntries: [], codes: ["461110"] });
    writeCachedAdvancedSearch("project-2", { results: [{ id: "b2" } as never], resultCodeEntries: [], codes: ["461121"] });

    expect(readCachedAdvancedSearch("project-1")?.results).toEqual([{ id: "b1" }]);
    expect(readCachedAdvancedSearch("project-2")?.results).toEqual([{ id: "b2" }]);
  });
});
