import type { InspectReport } from "../inspect/types.js";
import {
  TESTED_RELEASE_SET,
  type ExistingEngawaInfo,
  type IntegrationDisposition,
} from "./types.js";

export function buildIntegrationSection(
  inspectReport: InspectReport,
  existingEngawa: ExistingEngawaInfo,
): {
  disposition: IntegrationDisposition;
  testedReleaseSet: string;
  recommendedPackages: Array<{ name: string; version: string; required: boolean }>;
  requiredSurfaces: string[];
  optionalSurfaces: string[];
} {
  const hasAgentSurfaces =
    inspectReport.recommendation.engawaIntegration === "ALREADY_HAS_AGENT_SURFACES";
  const hasRepoEvidence =
    existingEngawa.packages.length > 0 || existingEngawa.surfaceHints.length > 0;

  let disposition: IntegrationDisposition = "NEW_INTEGRATION";
  if (hasAgentSurfaces && hasRepoEvidence) {
    disposition = "EXISTING_INTEGRATION_DETECTED";
  } else if (existingEngawa.packages.length > 0 || existingEngawa.surfaceHints.length > 0) {
    disposition = "PARTIAL_EXISTING_INTEGRATION";
  }

  const recommendedPackages = [
    {
      name: "@thierry-gilgen-ict/engawa-core",
      version: "0.1.1",
      required: true,
    },
    {
      name: "@thierry-gilgen-ict/engawa-discovery",
      version: "0.1.1",
      required: true,
    },
    {
      name: "@thierry-gilgen-ict/engawa-mcp",
      version: "0.1.1",
      required: true,
    },
    {
      name: "@thierry-gilgen-ict/engawa-react",
      version: "0.1.0",
      required: false,
    },
  ];

  const requiredSurfaces = [
    "llms.txt",
    "markdown-alternates-or-resources",
    "read-only-mcp-resources",
    "search_site",
  ];

  const optionalSurfaces = [
    "bring-your-agent-ui",
    "metadata-only-analytics",
    "distribution-map-after-explicit-user-request",
  ];

  return {
    disposition,
    testedReleaseSet: TESTED_RELEASE_SET,
    recommendedPackages,
    requiredSurfaces,
    optionalSurfaces,
  };
}
