export type FeatureFlagName =
  | "ai_reactivation"
  | "advanced_routing"
  | "ai_evals_async"
  | "conversation_summary"
  | "kv_core_integration"
  | "multi_office"
  | "white_label";

export type FeatureFlagValue = boolean | string | number;

export interface FeatureFlagDefaults {
  [key: string]: FeatureFlagValue;
}

// Global defaults — overridden per workspace in DB (FeatureFlagOverride table)
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagName, FeatureFlagValue> = {
  ai_reactivation: false,
  advanced_routing: false,
  ai_evals_async: true,
  conversation_summary: true,
  kv_core_integration: false,
  multi_office: false,
  white_label: false,
};

export function getFlag(
  flagName: FeatureFlagName,
  workspaceOverrides: Record<string, FeatureFlagValue> = {},
): FeatureFlagValue {
  return workspaceOverrides[flagName] ?? FEATURE_FLAG_DEFAULTS[flagName];
}
