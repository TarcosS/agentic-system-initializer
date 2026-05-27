const CDN_DEFAULTS = {
  baseUrl: "https://agentinit-b6hecpf6ebctd3h6.z02.azurefd.net/agentinit",
  cacheDir: ".agentinit/cache",
  timeout: 10_000,
  retries: 2,
} as const;

export interface CdnConfig {
  baseUrl: string;
  cacheDir: string;
  timeout: number;
  retries: number;
  offline: boolean;
}

export function loadCdnConfig(overrides?: Partial<CdnConfig>): CdnConfig {
  return {
    baseUrl: process.env["AGENTINIT_CDN_URL"] ?? overrides?.baseUrl ?? CDN_DEFAULTS.baseUrl,
    cacheDir: overrides?.cacheDir ?? CDN_DEFAULTS.cacheDir,
    timeout: overrides?.timeout ?? CDN_DEFAULTS.timeout,
    retries: overrides?.retries ?? CDN_DEFAULTS.retries,
    offline: overrides?.offline ?? process.env["AGENTINIT_OFFLINE"] === "1",
  };
}

export function getCdnVersionUrl(config: CdnConfig, version: string): string {
  return `${config.baseUrl}/v${version}`;
}
