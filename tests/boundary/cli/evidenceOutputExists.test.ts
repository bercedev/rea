import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, it } from "vitest";

import { projectAnalysisError } from "../../../src/domain/analysisErrorProjection.js";
import { createEvidence } from "../../../src/domain/evidence.js";
import { EvidenceFileError } from "../../../src/domain/evidenceErrors.js";
import { publishCliAnalysisEvidence } from "../../../src/cli/analysisEvidenceDelivery.js";

it("points an existing --evidence_output at another path instead of an overwrite the CLI lacks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rea-evidence-output-"));
  try {
    const target = join(directory, "bundle.json");
    await writeFile(target, "kept");
    const evidence = createEvidence(
      undefined,
      { id: "fixture", name: "Fixture", version: "1" },
      {
        operation: "inspect_recorded_crash",
        parameters: {},
        result: {},
        limitations: [],
      },
    );

    const result = await publishCliAnalysisEvidence(evidence, {
      providerId: "fixture",
      operation: "inspect_recorded_crash",
      signal: new AbortController().signal,
      detail: "complete",
      evidenceOutput: target,
    });

    expect(result).toMatchObject({
      category: "invalid_input",
      message:
        "Evidence file already exists, and this command never overwrites. Choose another --evidence_output path.",
      remediation: { action: expect.not.stringContaining("overwrite.") },
    });
    expect(await readFile(target, "utf8")).toBe("kept");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("keeps the overwrite advice for writers that accept overwrite", () => {
  expect(
    projectAnalysisError(new EvidenceFileError("write", "exists")),
  ).toMatchObject({
    message:
      "Evidence file already exists. Choose another path or allow overwrite.",
  });
});
