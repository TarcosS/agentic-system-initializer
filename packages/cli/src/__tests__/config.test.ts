import { describe, it, expect } from "vitest";
import { loadCdnConfig } from "../config.js";

describe("config", () => {
  it("loads default CDN config", () => {
    const config = loadCdnConfig();
    expect(config.baseUrl).toContain("blob.core.windows.net");
    expect(config.timeout).toBe(10_000);
    expect(config.retries).toBe(2);
  });

  it("respects overrides", () => {
    const config = loadCdnConfig({
      baseUrl: "https://custom.cdn.com/test",
      offline: true,
    });
    expect(config.baseUrl).toBe("https://custom.cdn.com/test");
    expect(config.offline).toBe(true);
  });
});
