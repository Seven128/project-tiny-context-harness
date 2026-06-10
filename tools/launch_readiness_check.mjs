#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { offline: false, json: false, output: null, strictExternal: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--offline") {
      options.offline = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--strict-external") {
      options.strictExternal = true;
    } else if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--output requires a path");
      }
      options.output = path.resolve(value);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`launch_readiness_check.mjs

Checks local launch-readiness surfaces and optionally compares public GitHub/npm
metadata against local package metadata.

Usage:
  node tools/launch_readiness_check.mjs [--offline] [--json] [--output tmp/sdlc/launch-readiness.md]
  node tools/launch_readiness_check.mjs --strict-external
`);
}

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function hasFile(relativePath) {
  return existsSync(path.join(repoRoot, relativePath));
}

function fileSize(relativePath) {
  return statSync(path.join(repoRoot, relativePath)).size;
}

function readBytes(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath));
}

function isGif(relativePath) {
  if (!hasFile(relativePath)) {
    return false;
  }
  const bytes = readBytes(relativePath);
  const header = bytes.subarray(0, 6).toString("ascii");
  return (header === "GIF89a" || header === "GIF87a") && bytes.includes(Buffer.from("NETSCAPE2.0", "ascii"));
}

function pngDimensions(relativePath) {
  if (!hasFile(relativePath)) {
    return null;
  }
  const bytes = readBytes(relativePath);
  const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || !pngHeader.every((value, index) => bytes[index] === value)) {
    return null;
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function pngIs(relativePath, width, height) {
  const dimensions = pngDimensions(relativePath);
  return dimensions?.width === width && dimensions?.height === height;
}

function addCheck(checks, id, ok, detail, severity = "required") {
  checks.push({ id, ok: Boolean(ok), detail, severity });
}

function contains(content, pattern) {
  return pattern.test(content);
}

function firstLines(content, count) {
  return content.split(/\r?\n/).slice(0, count).join("\n");
}

function hasCjk(content) {
  return /[\u3400-\u9fff]/.test(content);
}

const scorecardBadgePattern =
  /\[!\[OpenSSF Scorecard\]\(https:\/\/api\.securityscorecards\.dev\/projects\/github\.com\/Seven128\/project-tiny-context-harness\/badge\)\]\(https:\/\/securityscorecards\.dev\/viewer\/\?uri=github\.com\/Seven128\/project-tiny-context-harness\)/;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "project-tiny-context-harness-launch-readiness",
          Accept: "application/vnd.github+json, application/json"
        },
        timeout: 20_000
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`${url} returned HTTP ${response.statusCode}: ${body.slice(0, 300)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    request.on("timeout", () => {
      request.destroy(new Error(`${url} timed out`));
    });
    request.on("error", reject);
  });
}

function localChecks() {
  const checks = [];
  const rootPackage = readJson("package.json");
  const packageJson = readJson("packages/sdlc-harness/package.json");
  const rootReadme = read("README.md");
  const packageReadme = read("packages/sdlc-harness/README.md");
  const zhReadme = read("README.zh-CN.md");
  const launchKit = read("docs/launch/README.md");
  const launchProfile = read("docs/launch/profile.md");
  const primaryLaunch = read("docs/launch/primary-launch.md");
  const feedbackTriage = read("docs/launch/feedback-triage.md");
  const privateReview = read("docs/launch/private-review.md");
  const privateReviewShortlist = read("docs/launch/private-review-shortlist.md");
  const privateReviewLogTemplate = read("docs/launch/private-review-log-template.md");
  const adoptionStoryTemplate = read("docs/launch/adoption-story-template.md");
  const npmPublishRunbook = read("docs/launch/npm-publish-runbook.md");
  const npmCredentialUnblock = read("docs/launch/npm-credential-unblock.md");
  const codexForOssApplication = read("docs/launch/codex-for-oss-application.md");
  const awesomeListSubmissions = read("docs/launch/awesome-list-submissions.md");
  const responseTemplates = read("docs/launch/response-templates.md");
  const agentSurfaceRecipes = read("docs/agent-surface-recipes.md");
  const comparisonGuide = read("docs/comparison.md");
  const technicalArticle = read("docs/articles/fresh-agent-project-memory.md");
  const existingRepoAdoption = read("docs/adopt-existing-repo.md");
  const faq = read("docs/faq.md");
  const roadmap = read("docs/roadmap.md");
  const freshAgentWalkthrough = read("docs/examples/fresh-agent-recovery.md");
  const minimalContextSample = read("docs/examples/minimal-context-sample.md");
  const externalPrPacket = read("docs/launch/external-prs/README.md");
  const transcendaPatch = read("docs/launch/external-prs/transcenda-awesome-agentic-coding.patch");
  const jordimasPatch = read("docs/launch/external-prs/jordimas-awesome-agentic-engineering.patch");
  const awesomeOpenCodePatch = read("docs/launch/external-prs/awesome-opencode-project-tiny-context-harness.patch");
  const awesomeAiDevtoolsPatch = read("docs/launch/external-prs/jamesmurdza-awesome-ai-devtools.patch");
  const aiBoostPatch = read("docs/launch/external-prs/ai-boost-awesome-harness-engineering.patch");
  const picrewPatch = read("docs/launch/external-prs/picrew-awesome-agent-harness-data.patch");
  const demoPacket = read("docs/launch/demo.md");
  const metricsPacket = read("docs/launch/metrics.md");
  const metricsScript = read("tools/launch_metrics_snapshot.mjs");
  const marketMap = read("docs/launch/market-map.md");
  const outreachTargets = read("docs/launch/outreach-targets.md");
  const sourceWorkflow = read(".github/workflows/harness.yml");
  const maintainerWorkflow = read(".github/workflows/package.yml");
  const scorecardWorkflow = read(".github/workflows/scorecard.yml");
  const adoptionReportTemplate = read(".github/ISSUE_TEMPLATE/adoption_report.yml");
  const releaseScript = read("tools/release_npm.mjs");

  addCheck(checks, "root-package-name", rootPackage.name === "project-tiny-context-harness", "Root package name is project-tiny-context-harness.");
  addCheck(checks, "root-license", rootPackage.license === "MIT" && hasFile("LICENSE"), "Root package has MIT license metadata and LICENSE file.");
  addCheck(
    checks,
    "package-metadata",
    packageJson.license === "MIT" &&
      packageJson.homepage === "https://github.com/Seven128/project-tiny-context-harness#readme" &&
      packageJson.repository?.url === "git+https://github.com/Seven128/project-tiny-context-harness.git" &&
      packageJson.bugs?.url === "https://github.com/Seven128/project-tiny-context-harness/issues",
    "npm package has license, homepage, repository and bugs metadata."
  );
  for (const keyword of ["ai-agents", "coding-agent", "context-engineering", "developer-productivity", "claude-code"]) {
    addCheck(checks, `package-keyword-${keyword}`, packageJson.keywords?.includes(keyword), `npm package keyword includes ${keyword}.`);
  }
  addCheck(checks, "package-license-file", hasFile("packages/sdlc-harness/LICENSE"), "Packaged npm workspace includes LICENSE.");

  for (const [id, content] of [
    ["root-readme", rootReadme],
    ["package-readme", packageReadme]
  ]) {
    addCheck(
      checks,
      `${id}-positioning`,
      contains(content, /Project Tiny Context Harness/) &&
        contains(content, /repo-native project memory for AI coding agents/i) &&
        contains(content, /keep the memory, drop the ceremony/i),
      `${id} states Project Tiny Context Harness positioning.`
    );
    addCheck(checks, `${id}-why`, contains(content, /Why It Exists/), `${id} includes Why It Exists.`);
    addCheck(checks, `${id}-positioning-table`, contains(content, /Positioning/) && contains(content, /Spec-first kits/) && contains(content, /Task Master-style/), `${id} includes competitor positioning table.`);
    addCheck(
      checks,
      `${id}-fit-boundary`,
      contains(content, /Best for:/) &&
        contains(content, /Not for:/) &&
        contains(content, /durable project memory behind `AGENTS\.md`/) &&
        contains(content, /multiple agents or frequent fresh chats/) &&
        contains(content, /autonomous SDLC execution/) &&
        contains(content, /codebase semantic indexing or external docs retrieval/),
      `${id} gives first-visitor fit and non-fit boundaries.`
    );
    addCheck(
      checks,
      `${id}-before-after`,
      contains(content, /Concrete shift:/) &&
        contains(content, /Before: ask a fresh agent to read the repo and tell you what matters\./) &&
        contains(content, /After: ask it to read AGENTS\.md and project_context\/\*\* first/) &&
        contains(content, /validation paths before proposing code/),
      `${id} gives a static before/after recovery example.`
    );
    addCheck(checks, `${id}-quickstart`, contains(content, /Try It In 60 Seconds/) && contains(content, /make validate-context/), `${id} includes quickstart.`);
    addCheck(checks, `${id}-success-surface`, contains(content, /Expected result/) && contains(content, /Fresh-agent test prompt/), `${id} shows expected generated files and a fresh-agent test prompt.`);
    addCheck(checks, `${id}-demo-media`, contains(content, /demo-terminal\.gif/) && contains(content, /The demo shows the core loop/), `${id} embeds the launch demo GIF and explains the recovery loop.`);
  }
  addCheck(
    checks,
    "public-language-posture",
    contains(rootReadme, /English-first/) &&
      contains(packageReadme, /English-first/) &&
      !hasCjk(firstLines(rootReadme, 24)) &&
      !hasCjk(firstLines(packageReadme, 24)) &&
      contains(launchKit, /Language Posture/) &&
      contains(launchKit, /GitHub description, README first screen, npm copy/) &&
      contains(primaryLaunch, /Public-facing copy is English-first/) &&
      contains(outreachTargets, /README, npm and launch copy English-first/),
    "Public README, npm README and launch packet keep external promotion English-first, with no CJK text in the README first screen and only secondary localized docs."
  );
  addCheck(
    checks,
    "localized-readme",
    hasFile("README.zh-CN.md") &&
      hasFile("packages/sdlc-harness/assets/README.zh-CN.md") &&
      contains(rootReadme, /Translations: \[Chinese \(Simplified\)\]\(README\.zh-CN\.md\)/) &&
      contains(packageReadme, /Translations: \[Chinese \(Simplified\)\]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/README\.zh-CN\.md\)/) &&
      contains(zhReadme, /Project Tiny Context Harness 是给 AI coding agents 用的轻量项目记忆层/) &&
      contains(zhReadme, /保留项目记忆，丢掉流程仪式感/) &&
      contains(zhReadme, /英文主入口/) &&
      contains(zhReadme, /中文文档作为二级入口/),
    "Localized Chinese README exists as a secondary entry while public launch surfaces remain English-first."
  );
  addCheck(
    checks,
    "scorecard-badge",
    scorecardBadgePattern.test(rootReadme) &&
      scorecardBadgePattern.test(packageReadme) &&
      contains(launchKit, /OpenSSF Scorecard badge/),
    "README and package README expose the OpenSSF Scorecard badge as a first-screen trust surface."
  );
  addCheck(
    checks,
    "root-readme-prepublish-boundary",
    contains(rootReadme, /Rename publish status:/) &&
      contains(rootReadme, /npm `project-tiny-context-harness` is still pending registry publication/) &&
      contains(rootReadme, /install commands below are the post-publish path/) &&
      contains(rootReadme, /strict-external` no longer reports `npm-fetch`/) &&
      contains(rootReadme, /npm run release:npm/) &&
      contains(rootReadme, /npm run launch:check/),
    "Root README transparently labels install commands as post-publish while npm still returns 404."
  );
  addCheck(
    checks,
    "root-readme-source-preview",
    contains(rootReadme, /Source preview while npm publish is pending/) &&
      contains(rootReadme, /git clone https:\/\/github\.com\/Seven128\/project-tiny-context-harness\.git/) &&
      contains(rootReadme, /npm run smoke:quickstart/) &&
      contains(rootReadme, /packs the local workspace, installs it into a disposable repo/) &&
      contains(rootReadme, /validates the generated Minimal Context files/),
    "Root README gives reviewers a source-based preview path while npm publish is pending."
  );
  addCheck(
    checks,
    "fresh-agent-walkthrough",
    hasFile("docs/examples/fresh-agent-recovery.md") &&
      contains(rootReadme, /fresh-agent recovery walkthrough/) &&
      contains(freshAgentWalkthrough, /Before Minimal Context/) &&
      contains(freshAgentWalkthrough, /After Minimal Context/) &&
      contains(freshAgentWalkthrough, /not benchmark evidence/),
    "Fresh-agent recovery walkthrough exists, is linked from README and avoids benchmark claims."
  );
  addCheck(
    checks,
    "minimal-context-sample",
    hasFile("docs/examples/minimal-context-sample.md") &&
      contains(rootReadme, /Minimal Context sample project/) &&
      contains(packageReadme, /Minimal Context sample project/) &&
      contains(minimalContextSample, /Minimal Context Sample Project/) &&
      contains(minimalContextSample, /AGENTS\.md/) &&
      contains(minimalContextSample, /project_context\/global\.md/) &&
      contains(minimalContextSample, /project_context\/architecture\.md/) &&
      contains(minimalContextSample, /project_context\/areas\/main\.md/) &&
      contains(minimalContextSample, /project_context\/areas\/main\/verification\.md/) &&
      contains(minimalContextSample, /not a benchmark, template requirement or product-quality proof/i),
    "Minimal Context sample project exists, is linked from README and shows concrete Context file shape without benchmark claims."
  );
  addCheck(
    checks,
    "technical-article",
    hasFile("docs/articles/fresh-agent-project-memory.md") &&
      contains(rootReadme, /docs\/articles\/fresh-agent-project-memory\.md/) &&
      contains(packageReadme, /docs\/articles\/fresh-agent-project-memory\.md/) &&
      contains(launchKit, /\.\.\/articles\/fresh-agent-project-memory\.md/) &&
      contains(primaryLaunch, /fresh-agent-project-memory\.md/) &&
      contains(technicalArticle, /Fresh Coding-Agent Sessions Need Project Memory, Not More Ceremony/) &&
      contains(technicalArticle, /repo-native project memory for AI coding agents, not an autonomous SDLC system/) &&
      contains(technicalArticle, /Why Drop The Stage Ceremony/) &&
      contains(technicalArticle, /It is not a benchmark-proven productivity multiplier/) &&
      contains(technicalArticle, /While npm publication is still pending, use the source preview/),
    "Long-form technical article exists, is linked from launch surfaces and keeps claims within the project-memory/no-benchmark boundary."
  );
  addCheck(
    checks,
    "launch-faq",
    hasFile("docs/faq.md") &&
      contains(rootReadme, /FAQ]\(docs\/faq\.md\)/) &&
      contains(packageReadme, /FAQ]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/docs\/faq\.md\)/) &&
      contains(faq, /Is this just AGENTS\.md\?/) &&
      contains(faq, /Why not just write a better README\?/) &&
      contains(faq, /Why did you remove the old stage-based workflow\?/) &&
      contains(faq, /When should Context be updated\?/) &&
      contains(faq, /Does this replace tests or CI\?/) &&
      contains(faq, /Do not publish benchmark speedup claims from old stage-based results/) &&
      contains(faq, /source preview path/),
    "FAQ exists, is linked from README and answers launch/adoption objections without benchmark overclaiming."
  );
  addCheck(
    checks,
    "launch-response-templates",
    hasFile("docs/launch/response-templates.md") &&
      contains(launchKit, /response-templates\.md/) &&
      contains(primaryLaunch, /response-templates\.md/) &&
      contains(outreachTargets, /Response templates cover/) &&
      contains(responseTemplates, /AGENTS\.md Overlap/) &&
      contains(responseTemplates, /Benchmark Questions/) &&
      contains(responseTemplates, /Stage Ceremony/) &&
      contains(responseTemplates, /Tests And CI Boundary/) &&
      contains(responseTemplates, /Existing Repos/) &&
      contains(responseTemplates, /Do not claim adoption, awards, benchmark wins or productivity multipliers/) &&
      contains(responseTemplates, /Do not say old stage-based results prove the current package is faster/) &&
      contains(responseTemplates, /Adoption report issue form/),
    "Launch response templates exist and keep public replies narrow, factual and non-hype."
  );
  addCheck(
    checks,
    "private-review-packet",
    hasFile("docs/launch/private-review.md") &&
      contains(launchKit, /private-review\.md/) &&
      contains(launchKit, /private-review-shortlist\.md/) &&
      contains(launchKit, /private-review-log-template\.md/) &&
      contains(launchKit, /adoption-story-template\.md/) &&
      contains(launchKit, /Private review packet/) &&
      contains(outreachTargets, /Private review/) &&
      contains(outreachTargets, /5-10 private reviewers/) &&
      contains(privateReview, /Copy-Paste DM/) &&
      contains(privateReview, /Source preview/) &&
      contains(privateReview, /private-review-shortlist\.md/) &&
      contains(privateReview, /private-review-log-template\.md/) &&
      contains(privateReview, /adoption story/) &&
      contains(privateReview, /Do not ask private reviewers for stars/) &&
      contains(privateReview, /Broad launch still waits for the renamed package to be installable/) &&
      contains(privateReview, /quote consent: none, anonymous, public name, or public link/) &&
      contains(privateReview, /Private review is for copy and product clarity, not proof of quality/),
    "Private review packet supports small pre-launch feedback while npm publish is blocked, without asking for stars or making proof claims."
  );
  addCheck(
    checks,
    "private-review-shortlist",
    hasFile("docs/launch/private-review-shortlist.md") &&
      contains(launchKit, /Private review shortlist/) &&
      contains(outreachTargets, /private-review-shortlist\.md/) &&
      contains(privateReview, /private-review-shortlist\.md/) &&
      contains(privateReviewShortlist, /Aim for 5-10 people across at least three profiles/) &&
      contains(privateReviewShortlist, /Do not commit a filled shortlist/) &&
      contains(privateReviewShortlist, /Do not send the review DM to anyone who expects promotion, compensation or a reciprocal star/) &&
      contains(privateReviewShortlist, /Send in two waves/) &&
      contains(privateReviewShortlist, /It is not useful as a popularity signal/),
    "Private review shortlist helps select high-signal reviewers while avoiding private-data commits, star asks and fake adoption proof."
  );
  addCheck(
    checks,
    "private-review-log-template",
    hasFile("docs/launch/private-review-log-template.md") &&
      contains(launchKit, /Private review log template/) &&
      contains(privateReviewLogTemplate, /Keep filled logs under `tmp\/sdlc\/private-review\/\*\*`/) &&
      contains(privateReviewLogTemplate, /not in `project_context\/\*\*`/) &&
      contains(privateReviewLogTemplate, /Do not commit filled logs unless every reviewer explicitly approved/) &&
      contains(privateReviewLogTemplate, /Reviewer Tracker/) &&
      contains(privateReviewLogTemplate, /Consent level/) &&
      contains(privateReviewLogTemplate, /Triage Summary/) &&
      contains(privateReviewLogTemplate, /Conversion Decisions/) &&
      contains(privateReviewLogTemplate, /24-Hour Actions/) &&
      contains(privateReviewLogTemplate, /Do not claim adoption, benchmark wins, productivity gains or production validation/),
    "Private review log template captures consent and repeated feedback without leaking private details or becoming project Context."
  );
  addCheck(
    checks,
    "adoption-story-template",
    hasFile("docs/launch/adoption-story-template.md") &&
      contains(launchKit, /Adoption story template/) &&
      contains(outreachTargets, /adoption-story-template\.md/) &&
      contains(adoptionStoryTemplate, /adoption-report issue form already asks for quote\/story consent/) &&
      contains(adoptionStoryTemplate, /Do not publish a story without explicit consent/) &&
      contains(adoptionStoryTemplate, /Attribution level:/) &&
      contains(adoptionStoryTemplate, /Approved surfaces:/) &&
      contains(adoptionStoryTemplate, /Story Shape/) &&
      contains(adoptionStoryTemplate, /Repo \/ team type:/) &&
      contains(adoptionStoryTemplate, /Still missing:/) &&
      contains(adoptionStoryTemplate, /Only use these after the underlying feedback exists/) &&
      contains(adoptionStoryTemplate, /Do not publish:/) &&
      contains(adoptionStoryTemplate, /Benchmark-backed speedup/) &&
      contains(adoptionStoryTemplate, /Conversion Checklist/),
    "Adoption story template converts consented feedback into concrete recovery evidence without leaking private details or making proof claims."
  );
  addCheck(
    checks,
    "community-starter-issues",
    contains(rootReadme, /Early feedback and starter issues/) &&
      contains(packageReadme, /Early feedback and starter issues/) &&
      contains(rootReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/4/) &&
      contains(packageReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/4/) &&
      contains(rootReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/5/) &&
      contains(rootReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/6/) &&
      contains(rootReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/7/) &&
      contains(rootReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/8/) &&
      contains(packageReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/5/) &&
      contains(packageReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/6/) &&
      contains(packageReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/7/) &&
      contains(packageReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/8/) &&
      contains(rootReadme, /benchmark speedup claims need fresh Minimal Context benchmark runs/) &&
      contains(packageReadme, /benchmark speedup claims need fresh Minimal Context benchmark runs/),
    "README and package README expose adoption handoff and starter issues without benchmark overclaiming."
  );
  addCheck(
    checks,
    "public-roadmap",
    hasFile("docs/roadmap.md") &&
      contains(rootReadme, /roadmap]\(docs\/roadmap\.md\)/) &&
      contains(packageReadme, /roadmap]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/docs\/roadmap\.md\)/) &&
      contains(roadmap, /Repo-native project memory for fresh-agent recovery/) &&
      contains(roadmap, /## Now/) &&
      contains(roadmap, /## Next/) &&
      contains(roadmap, /## Later/) &&
      contains(roadmap, /## Not Planned/) &&
      contains(roadmap, /Publish the renamed npm package/) &&
      contains(roadmap, /public adoption stories/) &&
      contains(roadmap, /Re-run delivery benchmarks against the current Minimal Context design/) &&
      contains(roadmap, /Full SDLC phase gates, lifecycle state or work-product trees/) &&
      contains(roadmap, /validate-context` proves product quality/),
    "Public roadmap is linked from README/package README and keeps next steps bounded to Minimal Context without proof claims."
  );
  addCheck(
    checks,
    "comparison-guide",
    hasFile("docs/comparison.md") &&
      contains(rootReadme, /comparison guide]\(docs\/comparison\.md\)/) &&
      contains(packageReadme, /comparison guide]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/docs\/comparison\.md\)/) &&
      contains(faq, /comparison guide]\(comparison\.md\)/) &&
      contains(launchKit, /\.\.\/comparison\.md/) &&
      contains(launchKit, /Comparison guide/) &&
      contains(comparisonGuide, /Project Tiny Context Harness owns durable repo memory for fresh-agent recovery/) &&
      contains(comparisonGuide, /AGENTS\.md.*alone/) &&
      contains(comparisonGuide, /Spec-first kits/) &&
      contains(comparisonGuide, /Task planners/) &&
      contains(comparisonGuide, /Code intelligence \/ retrieval/) &&
      contains(comparisonGuide, /Use Harness When/) &&
      contains(comparisonGuide, /Use Something Else When/) &&
      contains(comparisonGuide, /Common Combinations/) &&
      contains(comparisonGuide, /Would a fresh coding agent need this fact before proposing a safe code change/) &&
      contains(comparisonGuide, /Do not evaluate Harness as/) &&
      contains(comparisonGuide, /benchmark-proven productivity multiplier/),
    "Comparison guide is linked from public docs and explains adjacent-tool fit without superiority or benchmark claims."
  );
  addCheck(
    checks,
    "agent-surface-recipes",
    hasFile("docs/agent-surface-recipes.md") &&
      contains(rootReadme, /agent surface recipes/) &&
      contains(packageReadme, /agent surface recipes/) &&
      contains(agentSurfaceRecipes, /Codex/) &&
      contains(agentSurfaceRecipes, /Claude Code/) &&
      contains(agentSurfaceRecipes, /Cursor/) &&
      contains(agentSurfaceRecipes, /Gemini CLI/) &&
      contains(agentSurfaceRecipes, /OpenCode/) &&
      contains(agentSurfaceRecipes, /--harness-folder \.opencode/) &&
      contains(agentSurfaceRecipes, /root `AGENTS\.md` plus `project_context\/\*\*`/) &&
      contains(agentSurfaceRecipes, /splits the repo memory and creates drift/) &&
      contains(launchKit, /Agent-surface recipes/) &&
      contains(primaryLaunch, /Agent surface recipes are linked/) &&
      contains(outreachTargets, /OpenCode setup note/),
    "Agent-surface recipes explain multi-agent adoption without splitting project_context."
  );
  addCheck(
    checks,
    "existing-repo-adoption-guide",
    hasFile("docs/adopt-existing-repo.md") &&
      contains(rootReadme, /adoption guide]\(docs\/adopt-existing-repo\.md\)/) &&
      contains(packageReadme, /adoption guide]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/docs\/adopt-existing-repo\.md\)/) &&
      contains(launchKit, /Existing-repo adoption guide/) &&
      contains(roadmap, /existing-repo adoption guide]\(adopt-existing-repo\.md\)/) &&
      contains(existingRepoAdoption, /git switch -c try-project-tiny-context-harness/) &&
      contains(existingRepoAdoption, /init --adopt/) &&
      contains(existingRepoAdoption, /AGENTS\.md \+ project_context\/\*\*/) &&
      contains(existingRepoAdoption, /Tool-specific files can still exist/) &&
      contains(existingRepoAdoption, /Duplicated memory drifts/) &&
      contains(existingRepoAdoption, /validate-context` checks recovery facts; it does not prove product quality/) &&
      contains(existingRepoAdoption, /adoption report/),
    "Existing-repo adoption guide is linked from public docs and explains safe init --adopt use without duplicating project memory."
  );

  addCheck(
    checks,
    "launch-profile-sheet",
    hasFile("docs/launch/profile.md") &&
      contains(launchKit, /profile\.md/) &&
      contains(launchKit, /Launch profile sheet/) &&
      contains(launchProfile, /Launch Profile Sheet/) &&
      contains(launchProfile, /Project Tiny Context Harness/) &&
      contains(launchProfile, /Minimal project memory for AI coding agents/) &&
      contains(launchProfile, /Minimal project memory and validation harness for AI coding agents\./) &&
      contains(launchProfile, /Repo-native project memory for fresh AI coding-agent sessions\./) &&
      contains(launchProfile, /Keep the memory\. Drop the ceremony\./) &&
      contains(launchProfile, /Developer Tools \/ AI coding-agent infrastructure \/ Context engineering/) &&
      contains(launchProfile, /AI coding-agent infrastructure/) &&
      contains(launchProfile, /Avoid using `sdlc` as the first tag/) &&
      contains(launchProfile, /Use GitHub as the primary launch URL until the renamed npm package is published/) &&
      contains(launchProfile, /Use only after npm publish/) &&
      contains(launchProfile, /Use while npm publish is pending/) &&
      contains(launchProfile, /Benchmark-proven faster/) &&
      contains(launchProfile, /Do not make external submission copy look Chinese-first/),
    "Launch profile sheet centralizes English-first external-submission fields and claims boundaries."
  );

  addCheck(
    checks,
    "launch-kit",
    contains(launchKit, /Launch Kit/) &&
      contains(launchKit, /Do not claim benchmark wins/) &&
      contains(launchKit, /Hacker News Draft/) &&
      contains(launchKit, /npm-publish-runbook\.md/) &&
      contains(launchKit, /awesome-list-submissions\.md/) &&
      contains(launchKit, /Readiness boundary/) &&
      contains(launchKit, /repo-hosted media/) &&
      contains(launchKit, /Keep the memory\. Drop the ceremony\./) &&
      contains(launchKit, /OpenSSF Scorecard workflow/) &&
      contains(launchKit, /Minimal Context sample project/) &&
      contains(launchKit, /FAQ/) &&
      contains(launchKit, /does not mean Product Hunt, curated-list submissions or awards are ready/),
    "Launch kit has copy-ready channel drafts, media pointers, readiness boundary and no-benchmark boundary."
  );
  addCheck(
    checks,
    "launch-operating-plan",
    contains(launchKit, /Launch Operating Plan/) &&
      contains(launchKit, /Channel Matrix/) &&
      contains(launchKit, /Community Handoff Surface/) &&
      contains(launchKit, /adoption handoff issue and starter issues are visible and labeled for discovery/) &&
      contains(launchKit, /good first issue`, `help wanted` and `documentation`/) &&
      contains(launchKit, /#4 uses `question`; #5, #6 and #8 use `documentation`, `good first issue` and `help wanted`; #7 uses `help wanted`/),
    "Launch kit has an operating plan, channel matrix and labeled community handoff surface."
  );
  addCheck(
    checks,
    "primary-launch-packet",
    contains(launchKit, /primary-launch\.md/) &&
      hasFile("docs/launch/primary-launch.md") &&
      contains(primaryLaunch, /Primary Launch Packet/) &&
      contains(primaryLaunch, /Hacker News Show HN/) &&
      contains(primaryLaunch, /npm run release:npm/) &&
      contains(primaryLaunch, /npm-publish-runbook\.md/) &&
      contains(primaryLaunch, /Product Hunt/) &&
      contains(primaryLaunch, /difference from using only AGENTS\.md/) &&
      contains(primaryLaunch, /Adoption reports \/ missing facts/) &&
      contains(primaryLaunch, /24-Hour Response Playbook/) &&
      contains(primaryLaunch, /feedback-triage\.md/) &&
      contains(primaryLaunch, /Do not ask for stars|Asking for stars/),
    "Primary launch packet has copy-ready first-channel copy, Product Hunt follow-up, response playbook and claims boundary."
  );
  addCheck(
    checks,
    "feedback-triage-runbook",
    hasFile("docs/launch/feedback-triage.md") &&
      contains(launchKit, /feedback-triage\.md/) &&
      contains(launchKit, /Feedback triage runbook/) &&
      contains(primaryLaunch, /feedback-triage\.md/) &&
      contains(feedbackTriage, /Launch Feedback Triage/) &&
      contains(feedbackTriage, /tmp\/sdlc\/launch-feedback/) &&
      contains(feedbackTriage, /First Hour/) &&
      contains(feedbackTriage, /Six-Hour Triage/) &&
      contains(feedbackTriage, /Patch Rules/) &&
      contains(feedbackTriage, /Issue Rules/) &&
      contains(feedbackTriage, /Adoption Evidence/) &&
      contains(feedbackTriage, /Channel Decision/) &&
      contains(feedbackTriage, /24-Hour Summary Template/) &&
      contains(feedbackTriage, /Treat stars, upvotes, comments and downloads as distribution telemetry/),
    "Feedback triage runbook turns launch comments into docs, issues or consented evidence without product-proof overclaims."
  );
  addCheck(
    checks,
    "npm-publish-runbook",
    hasFile("docs/launch/npm-publish-runbook.md") &&
      contains(npmPublishRunbook, /project-tiny-context-harness@0\.2\.39/) &&
      contains(npmPublishRunbook, /npm-credential-unblock\.md/) &&
      contains(npmPublishRunbook, /npm run release:npm -- --version 0\.2\.39 --publish --yes --full-gate --registry-smoke/) &&
      contains(npmPublishRunbook, /--otp 123456/) &&
      contains(npmPublishRunbook, /Do not post broad launch copy while the renamed package still returns 404/) &&
      contains(npmPublishRunbook, /You may not perform that action with these credentials/) &&
      contains(npmPublishRunbook, /credential, account policy or token permission issue/) &&
      contains(npmPublishRunbook, /npm profile get name email tfa --json/) &&
      contains(npmPublishRunbook, /npm access list collaborators agent-project-sdlc steve1998 --json/) &&
      contains(npmPublishRunbook, /current token can maintain the legacy package but cannot create or manage the renamed package namespace/) &&
      contains(npmPublishRunbook, /granular access tokens must be created on npmjs\.com, not from the CLI/) &&
      contains(npmPublishRunbook, /node tools\/launch_readiness_check\.mjs --strict-external/),
    "npm publish runbook documents first renamed publish, OTP path, npm 404 gate and post-publish verification."
  );
  addCheck(
    checks,
    "npm-credential-unblock",
    hasFile("docs/launch/npm-credential-unblock.md") &&
      contains(launchKit, /npm-credential-unblock\.md/) &&
      contains(launchKit, /npm credential unblock/) &&
      contains(npmCredentialUnblock, /npm Credential Unblock Checklist/i) &&
      contains(npmCredentialUnblock, /403 Forbidden - PUT https:\/\/registry\.npmjs\.org\/project-tiny-context-harness/) &&
      contains(npmCredentialUnblock, /Official npm References/) &&
      contains(npmCredentialUnblock, /Creating access tokens/) &&
      contains(npmCredentialUnblock, /2FA for publishing/) &&
      contains(npmCredentialUnblock, /Interactive Login With OTP/) &&
      contains(npmCredentialUnblock, /Website-Created Granular Token/) &&
      contains(npmCredentialUnblock, /Enable bypass 2FA only if this non-interactive token publish path requires it/) &&
      contains(npmCredentialUnblock, /npm config set \/\/registry\.npmjs\.org\/:_authToken/) &&
      contains(npmCredentialUnblock, /Post-Publish Gate/) &&
      contains(npmCredentialUnblock, /Do not commit `.npmrc`, tokens, OTP values/),
    "npm credential unblock checklist gives a safe path from 403 credentials failure to publish retry."
  );
  addCheck(
    checks,
    "codex-for-oss-application",
    hasFile("docs/launch/codex-for-oss-application.md") &&
      contains(launchKit, /codex-for-oss-application\.md/) &&
      contains(outreachTargets, /codex-for-oss-application\.md/) &&
      contains(codexForOssApplication, /Codex For OSS Application Packet/) &&
      contains(codexForOssApplication, /Official sources checked on 2026-06-10/) &&
      contains(codexForOssApplication, /Character count: 384/) &&
      contains(codexForOssApplication, /Character count: 302/) &&
      contains(codexForOssApplication, /Character count: 299/) &&
      contains(codexForOssApplication, /Do not claim official OpenAI integration/) &&
      contains(codexForOssApplication, /Selected for Codex for Open Source/) &&
      contains(codexForOssApplication, /not in `project_context\/\*\*`/),
    "Codex for OSS application packet has maintainer-reviewed copy fields, current-source links and no official-integration overclaim."
  );
  addCheck(
    checks,
    "release-npm-first-publish-target",
    contains(releaseScript, /registryPackageExists/) &&
      contains(releaseScript, /publish && !versionSpecified && !registryPackageExists/) &&
      contains(releaseScript, /return currentVersion/) &&
      contains(releaseScript, /"--access", "public"/) &&
      contains(releaseScript, /--otp/) &&
      contains(releaseScript, /otpProvided/),
    "release npm script keeps first renamed publish on the current workspace version and supports OTP without reporting the code."
  );
  addCheck(
    checks,
    "awesome-list-submissions",
    hasFile("docs/launch/awesome-list-submissions.md") &&
      contains(awesomeListSubmissions, /Awesome List Submission Packet/) &&
      contains(awesomeListSubmissions, /Transcenda\/awesome-agentic-coding/) &&
      contains(awesomeListSubmissions, /jordimas\/awesome-agentic-engineering/) &&
      contains(awesomeListSubmissions, /awesome-opencode\/awesome-opencode/) &&
      contains(awesomeListSubmissions, /awesome-ai-devtools/) &&
      contains(awesomeListSubmissions, /ai-boost\/awesome-harness-engineering/) &&
      contains(awesomeListSubmissions, /Picrew\/awesome-agent-harness/) &&
      contains(awesomeListSubmissions, /Agent Infrastructure \/ Configuration & Context Management/) &&
      contains(awesomeListSubmissions, /external-prs\/README\.md/) &&
      contains(awesomeListSubmissions, /Do not claim adoption, benchmark wins, awards/),
    "Awesome-list submission packet has P0 PR copy and deferred-list gates."
  );
  addCheck(
    checks,
    "external-pr-packets",
    hasFile("docs/launch/external-prs/README.md") &&
      hasFile("docs/launch/external-prs/transcenda-awesome-agentic-coding.patch") &&
      hasFile("docs/launch/external-prs/jordimas-awesome-agentic-engineering.patch") &&
      hasFile("docs/launch/external-prs/awesome-opencode-project-tiny-context-harness.patch") &&
      hasFile("docs/launch/external-prs/jamesmurdza-awesome-ai-devtools.patch") &&
      hasFile("docs/launch/external-prs/ai-boost-awesome-harness-engineering.patch") &&
      hasFile("docs/launch/external-prs/picrew-awesome-agent-harness-data.patch") &&
      contains(externalPrPacket, /Transcenda\/awesome-agentic-coding/) &&
      contains(externalPrPacket, /jordimas\/awesome-agentic-engineering/) &&
      contains(externalPrPacket, /awesome-opencode\/awesome-opencode/) &&
      contains(externalPrPacket, /jamesmurdza\/awesome-ai-devtools/) &&
      contains(externalPrPacket, /ai-boost\/awesome-harness-engineering/) &&
      contains(externalPrPacket, /Picrew\/awesome-agent-harness/) &&
      contains(externalPrPacket, /No direct pull request was opened by automation/) &&
      contains(externalPrPacket, /gh repo fork Transcenda\/awesome-agentic-coding --clone/) &&
      contains(externalPrPacket, /gh repo fork jordimas\/awesome-agentic-engineering --clone/) &&
      contains(externalPrPacket, /gh repo fork awesome-opencode\/awesome-opencode --clone/) &&
      contains(externalPrPacket, /gh repo fork jamesmurdza\/awesome-ai-devtools --clone/) &&
      contains(externalPrPacket, /gh repo fork ai-boost\/awesome-harness-engineering --clone/) &&
      contains(externalPrPacket, /gh repo fork Picrew\/awesome-agent-harness --clone/) &&
      contains(externalPrPacket, /gh pr create/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness to agent instructions and skills/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness to team adoption resources/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness to projects/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness to context delivery resources/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness to context engineering catalog/) &&
      contains(transcendaPatch, /Agent instructions and Skills/) &&
      contains(transcendaPatch, /minimal project-memory harness for AI coding agents/) &&
      contains(jordimasPatch, /Team Adoption/) &&
      contains(jordimasPatch, /Minimal project-memory and validation harness for teams adopting AI coding agents/) &&
      contains(awesomeOpenCodePatch, /data\/projects\/project-tiny-context-harness\.yaml/) &&
      contains(awesomeOpenCodePatch, /Minimal project memory for coding agents/) &&
      contains(awesomeOpenCodePatch, /OpenCode and other AI coding agents/) &&
      contains(awesomeAiDevtoolsPatch, /Tools that manage and sync AI agent configurations/) &&
      contains(awesomeAiDevtoolsPatch, /AI coding-agent project memory/) &&
      contains(awesomeAiDevtoolsPatch, /Codex, Claude Code, Cursor, Gemini CLI, OpenCode/) &&
      contains(aiBoostPatch, /harness-experimental/) &&
      contains(aiBoostPatch, /Seven128\/project-tiny-context-harness/) &&
      contains(aiBoostPatch, /without adding SDLC phase ceremony/) &&
      contains(picrewPatch, /Context & Working-State Engineering/) &&
      contains(picrewPatch, /Seven128\/project-tiny-context-harness/) &&
      contains(picrewPatch, /stars_snapshot: 0/),
    "External PR packet has exact patches, PR copy, manual gh commands and automation-boundary notes."
  );
  addCheck(checks, "launch-demo-storyboard", contains(launchKit, /Demo Storyboard/) && contains(launchKit, /fresh-agent test prompt/i) && contains(launchKit, /make validate-context/), "Launch kit has a demo storyboard tied to the README recovery test.");
  addCheck(
    checks,
    "launch-demo-packet",
    rootPackage.scripts?.["launch:demo"] === "node tools/launch_demo_capture.mjs" &&
      hasFile("tools/launch_demo_capture.mjs") &&
      hasFile("docs/launch/demo.md") &&
      hasFile("docs/launch/assets/demo-terminal.svg") &&
      contains(demoPacket, /Launch Demo Packet/) &&
      contains(demoPacket, /npm run launch:demo/) &&
      contains(demoPacket, /Repo-hosted demo media exists/) &&
      contains(demoPacket, /demo-terminal\.gif/) &&
      contains(demoPacket, /social-preview\.png/) &&
      contains(demoPacket, /product-hunt-gallery-1\.png/) &&
      contains(demoPacket, /Fresh-Agent Prompt/) &&
      contains(demoPacket, /Fresh-Agent Recovery Check/),
    "Launch demo packet has a reproducible capture command, transcript guide and repo-hosted media."
  );
  addCheck(
    checks,
    "launch-metrics-snapshot",
    rootPackage.scripts?.["launch:metrics"] === "node tools/launch_metrics_snapshot.mjs" &&
      hasFile("tools/launch_metrics_snapshot.mjs") &&
      hasFile("docs/launch/metrics.md") &&
      contains(launchKit, /metrics\.md/) &&
      contains(primaryLaunch, /npm run launch:metrics/) &&
      contains(outreachTargets, /npm run launch:metrics/) &&
      contains(metricsPacket, /Launch Metrics Snapshot/) &&
      contains(metricsPacket, /Do not treat stars, forks or downloads as product-quality proof/) &&
      contains(metricsScript, /project-tiny-context-harness/) &&
      contains(metricsScript, /agent-project-sdlc/) &&
      contains(metricsScript, /npm 404 does not fail the launch/),
    "Launch metrics snapshot script and runbook record distribution telemetry without turning it into product proof."
  );
  addCheck(
    checks,
    "launch-demo-media",
    isGif("docs/launch/assets/demo-terminal.gif") &&
      fileSize("docs/launch/assets/demo-terminal.gif") > 100_000 &&
      pngIs("docs/launch/assets/social-preview.png", 1280, 640) &&
      pngIs("docs/launch/assets/product-hunt-gallery-1.png", 1270, 760) &&
      pngIs("docs/launch/assets/product-hunt-gallery-2.png", 1270, 760) &&
      pngIs("docs/launch/assets/product-hunt-thumbnail.png", 240, 240),
    "Launch media includes a 1280x640 social preview, animated GIF, two 1270x760 Product Hunt gallery images and a 240x240 thumbnail."
  );
  addCheck(checks, "launch-milestones", contains(launchKit, /Star \/ Adoption Milestones/) && contains(launchKit, /10 stars/) && contains(launchKit, /500 stars/), "Launch kit has star/adoption milestone triggers without treating stars as proof.");
  addCheck(checks, "market-map", contains(marketMap, /Market Map/) && contains(marketMap, /Competitive Snapshot/) && contains(marketMap, /10-100 stars/), "Market map has competitor snapshot and feasibility bands.");
  addCheck(
    checks,
    "outreach-targets",
    contains(outreachTargets, /Outreach Targets/) &&
      contains(outreachTargets, /Priority Sequence/) &&
      contains(outreachTargets, /Curated Lists/) &&
      contains(outreachTargets, /starter issues #5-#8 exist and have discovery labels/) &&
      contains(outreachTargets, /question, documentation, good first issue and help wanted/) &&
      contains(outreachTargets, /OpenSSF Scorecard workflow/) &&
      contains(outreachTargets, /Minimal Context sample project/) &&
      contains(outreachTargets, /FAQ answers/) &&
      contains(outreachTargets, /awesome-list-submissions\.md/) &&
      contains(outreachTargets, /Awards/) &&
      contains(outreachTargets, /Do not submit to award programs before the demo and first public feedback exist/),
    "Outreach targets map current launch, curated-list and award gates."
  );
  addCheck(checks, "contributing", hasFile("CONTRIBUTING.md") && contains(read("CONTRIBUTING.md"), /Do not claim benchmark wins/), "CONTRIBUTING.md exists and preserves benchmark-claim boundary.");
  addCheck(checks, "security-policy", hasFile("SECURITY.md") && contains(read("SECURITY.md"), /Reporting A Vulnerability/) && contains(read("SECURITY.md"), /Unsafe file writes/), "SECURITY.md exists with private reporting and Harness-specific scope.");
  addCheck(checks, "dependabot", hasFile(".github/dependabot.yml") && contains(read(".github/dependabot.yml"), /package-ecosystem: "npm"/) && contains(read(".github/dependabot.yml"), /package-ecosystem: "github-actions"/), "Dependabot checks npm and GitHub Actions ecosystems.");
  addCheck(
    checks,
    "scorecard-workflow",
    hasFile(".github/workflows/scorecard.yml") &&
      contains(scorecardWorkflow, /name: OpenSSF Scorecard/) &&
      contains(scorecardWorkflow, /branches:\s*\n\s+- main/) &&
      contains(scorecardWorkflow, /schedule:\s*\n\s+- cron:/) &&
      contains(scorecardWorkflow, /workflow_dispatch:/) &&
      contains(scorecardWorkflow, /security-events: write/) &&
      contains(scorecardWorkflow, /id-token: write/) &&
      contains(scorecardWorkflow, /uses: ossf\/scorecard-action@v2\.4\.3/) &&
      contains(scorecardWorkflow, /results_format: sarif/) &&
      contains(scorecardWorkflow, /publish_results: true/) &&
      contains(scorecardWorkflow, /uses: github\/codeql-action\/upload-sarif@v3/),
    "OpenSSF Scorecard workflow publishes SARIF results and public scorecard data with narrow permissions."
  );
  addCheck(checks, "issue-templates", hasFile(".github/ISSUE_TEMPLATE/bug_report.yml") && hasFile(".github/ISSUE_TEMPLATE/feature_request.yml"), "Bug and feature issue templates exist.");
  addCheck(
    checks,
    "adoption-report-template",
    hasFile(".github/ISSUE_TEMPLATE/adoption_report.yml") &&
      contains(adoptionReportTemplate, /What was the agent forgetting or rediscovering/) &&
      contains(adoptionReportTemplate, /Short adoption story/) &&
      contains(adoptionReportTemplate, /Public quote \/ story consent/) &&
      contains(adoptionReportTemplate, /No public quote/) &&
      contains(adoptionReportTemplate, /Anonymous role only/) &&
      contains(adoptionReportTemplate, /GitHub username and public link/) &&
      contains(adoptionReportTemplate, /Approved quote or paraphrase/) &&
      contains(adoptionReportTemplate, /Public link for attribution/) &&
      contains(adoptionReportTemplate, /I removed secrets, customer details, private repository names, raw chat logs and private code/) &&
      contains(rootReadme, /adoption report/),
    "Adoption-report issue template exists, README links to it, and public story consent/privacy fields are present."
  );
  addCheck(checks, "pr-template", hasFile(".github/PULL_REQUEST_TEMPLATE.md"), "Pull request template exists.");
  addCheck(checks, "quickstart-smoke", hasFile("tools/quickstart_smoke.mjs") && rootPackage.scripts?.["smoke:quickstart"], "Quickstart smoke script and npm script exist.");
  addCheck(checks, "launch-check-script", rootPackage.scripts?.["launch:check"] === "node tools/launch_readiness_check.mjs --offline", "launch:check script runs offline readiness check.");

  addCheck(
    checks,
    "consumer-workflow-boundary",
    contains(sourceWorkflow, /Run harness gate/) &&
      contains(sourceWorkflow, /Prepare source workspace CLI/) &&
      contains(sourceWorkflow, /hashFiles\('packages\/sdlc-harness\/package\.json'\) != ''/) &&
      contains(sourceWorkflow, /npm run build --workspace project-tiny-context-harness/) &&
      !contains(sourceWorkflow, /npm test --workspace project-tiny-context-harness|package check-source|npm publish/),
    "Consumer workflow runs the Harness gate, allows a source-workspace-only local CLI build, and excludes maintainer package checks."
  );
  addCheck(
    checks,
    "maintainer-workflow",
    contains(maintainerWorkflow, /Test package/) &&
      contains(maintainerWorkflow, /\.github\/workflows\/scorecard\.yml/) &&
      contains(maintainerWorkflow, /Check package canonical source drift/) &&
      contains(maintainerWorkflow, /node packages\/sdlc-harness\/dist\/cli\.js package check-source/) &&
      contains(maintainerWorkflow, /Validate source Context/),
    "Maintainer package CI runs package tests, source drift from the source root, and Context validation."
  );
  addCheck(
    checks,
    "node-engine-ci-matrix",
    packageJson.engines?.node === ">=20" &&
      contains(maintainerWorkflow, /node-version:\s*\$\{\{\s*matrix\.node-version\s*\}\}/) &&
      contains(maintainerWorkflow, /node-version:\s*\["20",\s*"24"\]/),
    "Package CI covers the declared Node >=20 floor and current Node 24."
  );

  return checks;
}

async function externalChecks(localPackageJson) {
  const checks = [];
  let github = null;
  let latestRelease = null;
  let npmLatest = null;
  let downloads = null;

  try {
    github = await requestJson("https://api.github.com/repos/Seven128/project-tiny-context-harness");
    const expectedHomepage = "https://www.npmjs.com/package/project-tiny-context-harness";
    const requiredTopics = [
      "ai-agents",
      "coding-agent",
      "codex",
      "claude-code",
      "cursor",
      "gemini-cli",
      "opencode",
      "agent-context",
      "context-engineering",
      "context-management",
      "agents-md",
      "project-memory",
      "agent-memory",
      "ai-coding",
      "developer-tools",
      "developer-productivity",
      "cli",
      "sdlc",
      "workflow"
    ];
    const githubTopics = Array.isArray(github.topics) ? github.topics : [];
    addCheck(checks, "github-description", github.description === "Minimal project memory and validation harness for AI coding agents.", `GitHub description: ${github.description ?? "(empty)"}`, "external");
    addCheck(checks, "github-homepage", github.homepage === expectedHomepage, `GitHub homepage: ${github.homepage ?? "(empty)"}`, "external");
    addCheck(checks, "github-license", github.license?.spdx_id === "MIT", `GitHub detected license: ${github.license?.spdx_id ?? "(none)"}`, "external");
    addCheck(checks, "github-topics", requiredTopics.every((topic) => githubTopics.includes(topic)), `GitHub topics: ${githubTopics.length > 0 ? githubTopics.join(", ") : "(none)"}`, "external");
    addCheck(checks, "github-stars", typeof github.stargazers_count === "number", `GitHub stars: ${github.stargazers_count}`, "external-info");
    addCheck(checks, "github-forks", typeof github.forks_count === "number", `GitHub forks: ${github.forks_count}`, "external-info");
  } catch (error) {
    addCheck(checks, "github-fetch", false, error instanceof Error ? error.message : String(error), "external");
  }

  try {
    latestRelease = await requestJson("https://api.github.com/repos/Seven128/project-tiny-context-harness/releases/latest");
    addCheck(
      checks,
      "github-release-title",
      latestRelease.name === "Project Tiny Context Harness 0.2.39 - legacy npm package",
      `GitHub latest release title: ${latestRelease.name ?? "(empty)"}`,
      "external"
    );
    addCheck(
      checks,
      "github-release-rename-boundary",
      /predates the npm package rename/i.test(latestRelease.body ?? "") &&
        /agent-project-sdlc version 0\.2\.39/i.test(latestRelease.body ?? "") &&
        /project-tiny-context-harness latest/i.test(latestRelease.body ?? "") &&
        /does not claim benchmark-proven delivery speedups/i.test(latestRelease.body ?? ""),
      "GitHub latest release explains the legacy package name, renamed-package gate and no-benchmark boundary.",
      "external"
    );
  } catch (error) {
    addCheck(checks, "github-release-fetch", false, error instanceof Error ? error.message : String(error), "external");
  }

  try {
    npmLatest = await requestJson("https://registry.npmjs.org/project-tiny-context-harness/latest");
    addCheck(checks, "npm-description", npmLatest.description === localPackageJson.description, `npm latest description: ${npmLatest.description ?? "(empty)"}`, "external");
    addCheck(checks, "npm-license", npmLatest.license === localPackageJson.license, `npm latest license: ${npmLatest.license ?? "(none)"}`, "external");
    addCheck(checks, "npm-homepage", npmLatest.homepage === localPackageJson.homepage, `npm latest homepage: ${npmLatest.homepage ?? "(none)"}`, "external");
    addCheck(checks, "npm-keywords", localPackageJson.keywords.every((keyword) => npmLatest.keywords?.includes(keyword)), `npm latest keywords: ${npmLatest.keywords?.join(", ") ?? "(none)"}`, "external");
    addCheck(checks, "npm-repository", npmLatest.repository?.url === localPackageJson.repository?.url, `npm latest repository: ${npmLatest.repository?.url ?? "(none)"}`, "external");
    addCheck(checks, "npm-bugs", npmLatest.bugs?.url === localPackageJson.bugs?.url, `npm latest bugs URL: ${npmLatest.bugs?.url ?? "(none)"}`, "external");
    addCheck(checks, "npm-version", npmLatest.version === localPackageJson.version, `npm latest version: ${npmLatest.version}`, "external-info");
  } catch (error) {
    addCheck(checks, "npm-fetch", false, error instanceof Error ? error.message : String(error), "external");
  }

  try {
    downloads = await requestJson("https://api.npmjs.org/downloads/point/last-week/project-tiny-context-harness");
    addCheck(checks, "npm-downloads", typeof downloads.downloads === "number", `npm downloads last week: ${downloads.downloads} (${downloads.start} to ${downloads.end})`, "external-info");
  } catch (error) {
    addCheck(checks, "npm-downloads-fetch", false, error instanceof Error ? error.message : String(error), "external-info");
  }
  return { checks, github, latestRelease, npmLatest, downloads };
}

function summarize(checks, options) {
  const requiredFailures = checks.filter((check) => !check.ok && check.severity === "required");
  const externalFailures = checks.filter((check) => !check.ok && check.severity === "external");
  const exitOk = requiredFailures.length === 0 && (!options.strictExternal || externalFailures.length === 0);
  let status = "pass";
  if (requiredFailures.length > 0 || (options.strictExternal && externalFailures.length > 0)) {
    status = "fail";
  } else if (externalFailures.length > 0) {
    status = "local-pass-external-action-needed";
  }
  return { status, exitOk, requiredFailures, externalFailures };
}

function renderMarkdown(report) {
  const lines = [
    "# Launch Readiness Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.offline ? "offline" : "online"}`,
    `Status: ${report.summary.status}`,
    "",
    "## Local Checks",
    ""
  ];

  for (const check of report.localChecks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.detail}`);
  }

  if (report.externalChecks.length > 0) {
    lines.push("", "## External Checks", "");
    for (const check of report.externalChecks) {
      const label = check.severity === "external-info" ? "INFO" : check.ok ? "PASS" : "TODO";
      lines.push(`- ${label} ${check.id}: ${check.detail}`);
    }
  } else {
    lines.push("", "## External Checks", "", "- Skipped because --offline was set.");
  }

  lines.push("", "## Next Actions", "");
  if (report.summary.requiredFailures.length > 0) {
    for (const check of report.summary.requiredFailures) {
      lines.push(`- Fix local readiness check: ${check.id}.`);
    }
  } else {
    lines.push("- Local launch surface is ready for review.");
  }
  if (report.summary.externalFailures.length > 0) {
    for (const check of report.summary.externalFailures) {
      lines.push(`- Update external metadata or publish a new package: ${check.id}.`);
    }
  }
  if (report.offline) {
    lines.push("- Run without --offline before launch to compare public GitHub/npm metadata.");
  }

  return `${lines.join("\n")}\n`;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const localPackageJson = readJson("packages/sdlc-harness/package.json");
const local = localChecks();
let external = { checks: [] };
if (!options.offline) {
  try {
    external = await externalChecks(localPackageJson);
  } catch (error) {
    addCheck(external.checks, "external-fetch", false, error instanceof Error ? error.message : String(error), "external");
  }
}

const allChecks = [...local, ...external.checks];
const summary = summarize(allChecks, options);
const report = {
  generatedAt: new Date().toISOString(),
  offline: options.offline,
  strictExternal: options.strictExternal,
  summary,
  localChecks: local,
  externalChecks: external.checks
};

const output = options.json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report);
if (options.output) {
  writeFileSync(options.output, output, "utf8");
}
process.stdout.write(output);
process.exitCode = summary.exitOk ? 0 : 1;
