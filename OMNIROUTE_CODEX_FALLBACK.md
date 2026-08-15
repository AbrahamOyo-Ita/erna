# OmniRoute as a Codex Coding-Agent Fallback

Verified: 11 August 2026

## Decision

**Yes. OmniRoute is suitable as a local fallback backend for the Codex CLI after the ChatGPT/Codex plan allowance is exhausted.**

The Codex CLI remains the coding-agent harness that reads the repository, edits files, runs commands and follows `AGENTS.md`. OmniRoute replaces the model endpoint and routes the model requests to other providers.

This does **not** extend the hosted ChatGPT/Codex subscription, reactivate exhausted OpenAI quota, or continue the exact hosted chat session. It starts a separate local Codex CLI session on this computer.

## What was verified on this computer

- Windows environment
- Node.js `v24.16.0`: compatible with OmniRoute's current Node.js 24 support
- npm `11.13.0`
- Codex CLI `0.144.5`: newer than the `0.137+` profile format required by the OmniRoute guide
- User Codex config exists at `~/.codex/config.toml`
- Current default remains `gpt-5.6-sol` with low reasoning
- No custom model provider is currently configured
- Docker is not installed, so the practical installation path is the npm package
- PowerShell blocks the unsigned npm-generated `codex.ps1`; `codex.cmd` works and should be used in commands on this machine

No OmniRoute package, provider credential or global Codex configuration has been installed or changed yet.

## Correct operating model

```text
Erna repository
      |
      v
Local Codex CLI (coding-agent tools and AGENTS.md)
      |
      v
Local OmniRoute on 127.0.0.1:20128
      |
      +--> approved provider API/model A
      +--> approved provider API/model B
      +--> approved local model
      `--> fallback when a provider is unavailable or out of quota
```

If the OpenAI/Codex allowance is exhausted, a fallback route must not select OmniRoute model IDs beginning with `cx/`, because those use a Codex/ChatGPT connection and still depend on the exhausted allowance. The fallback combo must contain only non-Codex providers.

## Confirmed compatibility

The official Codex configuration supports custom model providers with:

- A provider name
- A base URL
- The Responses API wire format
- A provider-specific environment-variable key
- Separate named profile files selected with `codex --profile <name>`

The official OmniRoute integration exposes `http://localhost:20128/v1`, translates Codex Responses API traffic when an upstream only supports Chat Completions, and provides two supported workflows:

1. `omniroute setup-codex` creates Codex profile files.
2. `omniroute launch-codex` launches Codex with temporary provider overrides without replacing the normal Codex configuration.

For this computer, the second workflow is the safest first test because it preserves the existing OpenAI configuration.

## Recommended provider policy

Do not enable every provider in OmniRoute's `auto` pool. Coding requests can contain private source code, configuration, logs and tool output. Use a dedicated allow-listed combo named for the fallback purpose.

Preferred order:

1. A local model through Ollama, if the computer is powerful enough, for private/offline work.
2. Official developer APIs with the user's own API keys and acceptable current terms, such as Google Gemini API, Groq, Cerebras, Mistral or OpenRouter.
3. Explicitly reviewed free coding-model services for low-sensitivity work only.

Do not use these as the default for the private Erna repository without a fresh terms and privacy review:

- Browser-cookie providers
- Unofficial web wrappers
- OAuth routes intended only for a vendor's own client
- Anonymous/free relays with unclear retention
- Kiro through a third-party harness, because OmniRoute's own current free-tier research flags a vendor restriction on that use
- Any provider whose terms prohibit proxy access or whose privacy policy permits training on submitted code

Free tiers are not a reliability guarantee. Quotas, model access and provider terms can change. A small paid developer API budget plus a local model is a more dependable fallback than relying only on anonymous free endpoints.

## Safe installation plan

These commands are a reviewed plan, not a record of completed installation.

### 1. Install the canonical package

Use the package published by the canonical repository only:

```powershell
npm.cmd install -g omniroute
```

After installation, record the installed version and run a dependency audit before connecting credentials.

### 2. Start the gateway locally

```powershell
omniroute.cmd
```

Open `http://127.0.0.1:20128`. Keep it loopback-only. Do not expose port `20128` to the internet or local network.

### 3. Harden it before adding provider credentials

- Configure a strong `STORAGE_ENCRYPTION_KEY` before saving provider keys.
- Require an API key for `/v1/*` requests with `REQUIRE_API_KEY=true`.
- Keep `ALLOW_API_KEY_REVEAL=false`.
- Keep the dashboard and proxy bound to loopback.
- Use a strong dashboard password.
- Disable the machine-derived CLI token on a shared Windows account or shared PC.
- Configure credential/PII masking and short log retention.
- Never place upstream provider keys or the OmniRoute key in this repository.

The current OmniRoute security documentation says credentials are encrypted with AES-256-GCM when `STORAGE_ENCRYPTION_KEY` is present and otherwise use plaintext passthrough. The key is therefore mandatory for this setup.

### 4. Connect approved non-Codex providers

In the local OmniRoute dashboard:

1. Add only approved providers.
2. Prefer provider-issued API keys over browser cookies or copied session credentials.
3. Test each provider independently.
4. Create a fallback combo containing no `cx/` model.
5. Set per-provider budget and rate limits.
6. Confirm the logs show the intended provider for test requests.

### 5. Create an OmniRoute endpoint key

Create a client key under the OmniRoute Endpoints/API Keys screen. This key authenticates Codex CLI to the local gateway; it is different from the upstream provider keys.

Store it as `OMNIROUTE_API_KEY` outside the repo. Do not put the value in `config.toml`, `.env.local`, a Markdown document, a screenshot or chat.

### 6. Preview Codex profiles

```powershell
omniroute.cmd setup-codex --dry-run
```

Review the generated provider/model list. Then generate only the selected provider profiles, using the exact patterns reported by the installed catalog:

```powershell
omniroute.cmd setup-codex --only <approved-provider-patterns>
```

The command writes separate `~/.codex/<name>.config.toml` profiles. It does not need to replace the normal `~/.codex/config.toml` defaults.

### 7. Start the fallback coding agent

Use one of the generated non-Codex profiles:

```powershell
codex.cmd --profile <generated-profile-name>
```

Or use OmniRoute's temporary launcher, which does not write provider changes into the normal Codex configuration:

```powershell
omniroute.cmd launch-codex --model <approved-model-or-combo>
```

Run it from `C:\Users\HomePC\Downloads\Erna Saas` so the local Codex agent receives the repository context and `AGENTS.md` rules.

## Optional manual profile

If the automatic profile generator is unreliable, a separate profile file can be created at `~/.codex/omniroute-fallback.config.toml`:

```toml
model = "<exact-approved-OmniRoute-model-or-combo-id>"
model_provider = "omniroute"

[model_providers.omniroute]
name = "OmniRoute local fallback"
base_url = "http://127.0.0.1:20128/v1"
env_key = "OMNIROUTE_API_KEY"
requires_openai_auth = false
wire_api = "responses"
```

Launch it with:

```powershell
codex.cmd --profile omniroute-fallback
```

Do not guess context-window or output-token values. Generate them from the connected model's real catalog or verify them against that provider's current official documentation.

## Acceptance test before relying on it

1. Stop using the OpenAI default and launch the explicit OmniRoute fallback profile.
2. Ask the agent to identify the current working directory and read `AGENTS.md`.
3. Ask for a read-only summary of one Erna file.
4. Check OmniRoute logs and confirm a non-`cx/` provider handled the request.
5. Make a harmless change on a temporary Git branch.
6. Run TypeScript/typecheck through the agent.
7. Confirm the agent asks for approvals and respects the workspace sandbox.
8. Interrupt the primary provider and confirm the approved second provider handles the next request.
9. Search the logs for secrets and source-code retention; adjust logging before real use.
10. Reopen normal Codex with `codex.cmd` and confirm the original OpenAI configuration is unchanged.

## Important limitations

- The model quality will depend on the selected upstream model. The Codex CLI harness cannot make a weak model equal to OpenAI Codex.
- Hosted connectors, this chat's state, subscription entitlements and OpenAI cloud tasks do not transfer to the local fallback session.
- A new local session will read the repository documents but will not automatically inherit this chat's hidden context.
- Provider quotas and terms can change without an OmniRoute release.
- Model-specific tool calling, long context, image support and structured output must be tested before production coding work.

## Sources

- OmniRoute canonical repository: <https://github.com/diegosouzapw/OmniRoute>
- OmniRoute Codex configuration: <https://github.com/diegosouzapw/OmniRoute/wiki/Codex-CLI-Configuration>
- OmniRoute CLI integrations: <https://github.com/diegosouzapw/OmniRoute/wiki/CLI-Integrations>
- OmniRoute quick start: <https://github.com/diegosouzapw/OmniRoute/blob/release/v3.8.50/docs/getting-started/QUICK-START.md>
- OmniRoute free-tier and terms research: <https://github.com/diegosouzapw/OmniRoute/blob/main/docs/reference/FREE_TIERS.md>
- OmniRoute security policy: <https://github.com/diegosouzapw/OmniRoute/security>
- Official Codex custom-provider configuration: <https://learn.chatgpt.com/docs/config-file/config-advanced#custom-model-providers>
- Official Codex profile configuration: <https://learn.chatgpt.com/docs/config-file/config-advanced#profiles>

## Current status

Research and local compatibility verification are complete. Installation is intentionally pending explicit approval because it adds a global npm package, creates a local service and later requires provider credentials.
