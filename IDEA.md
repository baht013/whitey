# Whitey - Project Idea

Draft date: 2026-06-03  
Status: concept / product definition  
Working name: Whitey

## 1. Executive summary

Whitey is a lightweight, local-first multi-agent orchestration tool for AI-assisted software development. It is inspired by Oh My Codex, but intentionally smaller, more focused, and designed around the specific workflows needed for fast local development.

Whitey provides a central place to define and run:

- Agents
- Skills
- Hooks
- Policies
- Memory
- MCP tools
- Provider routing rules
- Session state
- Prompt optimization rules

The core idea is to give developers a controlled local runtime where coding agents can plan, execute, validate, remember, and delegate work without turning the development environment into a heavy framework.

Whitey should work well with GitHub Copilot as a primary target, but the architecture should not be locked to Copilot. It should support different providers and execution backends, including tmux-based orchestration and native subagent systems where available.

At a high level, Whitey is not another coding model. It is the local operating layer around coding models.

## 2. One-sentence pitch

Whitey is a lightweight local orchestration layer that lets developers manage AI coding agents, skills, hooks, memory, MCP tools, and provider delegation from one project-level control plane.

## 3. The problem Whitey solves

Modern AI development workflows are powerful but fragmented. A developer may use Copilot, Codex, Gemini, Claude, local scripts, MCP servers, memory files, shell tools, Kubernetes tooling, linters, and security checks. Each tool can help, but the workflow often becomes inconsistent and hard to control.

Common problems:

1. No single place to define agent behavior
   - Agent prompts, roles, permissions, and workflows are scattered across IDE settings, markdown files, shell scripts, and provider-specific config.

2. Poor session continuity
   - Agents often forget what happened in previous sessions.
   - Developers repeat context manually.
   - Plans, decisions, and validation results are lost or buried in chat history.

3. Weak memory discipline
   - Memory may be too broad, stale, duplicated, or unsafe.
   - Important project decisions are not automatically captured.
   - Temporary observations are confused with durable project facts.

4. Missing validation hooks
   - AI agents can write code but often do not consistently run tests, linters, type checks, security scans, policy checks, or Kubernetes validation.
   - Validation depends on the developer remembering to ask.

5. Tool access is not governed well enough
   - MCP tools can expose powerful capabilities.
   - Shell access, Kubernetes access, file modification, and web search should be governed by explicit policy.

6. Provider selection is manual
   - Some tasks need a strong planning model.
   - Some tasks only need a cheap or fast model.
   - Some tasks are operational, like checking pods or logs.
   - Today, the developer often has to decide manually which provider should do what.

7. Heavy orchestration tools may be more than needed
   - Tools like Oh My Codex demonstrate the value of agent teams, hooks, skills, and durable state, but Whitey should be smaller and optimized for the workflows the developer actually needs.

Whitey addresses these problems by creating a thin, practical runtime layer around existing AI coding tools.

## 4. Why Whitey is needed now

AI coding tools are moving from simple chat assistants to agentic systems that can plan, edit files, run shell commands, call tools, interact with repositories, and use external context. That makes them more useful, but also creates a need for orchestration, policy, and observability.

Whitey is needed because local development with AI agents requires more than a prompt window. It requires:

- Repeatable session setup
- Durable memory
- Explicit agent roles
- Tool governance
- Automatic validation
- Safe provider delegation
- Auditable execution logs
- Standardized project conventions

Without this layer, each project slowly accumulates ad hoc prompts, scripts, memories, and tool configs. Whitey turns that into a coherent development system.

## 5. Inspiration and differentiation

Whitey is inspired by Oh My Codex, especially the idea of improving a coding agent with workflow conventions, agents, skills, hooks, memory, and durable state.

However, Whitey should be different in several important ways:

| Area | Oh My Codex style | Whitey direction |
| --- | --- | --- |
| Scope | Rich workflow layer with many roles and flows | Smaller, sharper, local-first control plane |
| Target | Codex-first | Copilot-first initially, provider-agnostic by design |
| Runtime | Codex workflow enhancement | Generic agent orchestration runtime |
| Backend | tmux-oriented team runtime and Codex plugin concepts | Pluggable backends: tmux, native subagents, future runners |
| Philosophy | Full enhanced operating mode | Minimal features that accelerate local development |
| Configuration | Tool-specific conventions | Neutral project-level config that can map to many providers |
| Validation | Hook-driven possibilities | Validation hooks as a first-class product feature |
| Memory | Durable state as part of workflow | Memory management as a core design center |

Whitey should not try to clone Oh My Codex. It should extract the parts that matter for fast local development and make them simpler, more portable, and more policy-aware.

## 6. Product principles

### 6.1 Local-first

Whitey should run primarily on the developer's machine and inside the project repository. It should not require a cloud service to be useful.

### 6.2 Provider-agnostic

Copilot can be the first main integration, but Whitey should not assume one model provider forever. Provider support should be implemented through adapters.

Examples:

- GitHub Copilot
- OpenAI Codex
- Gemini
- Claude
- Local models
- Custom command-based providers

### 6.3 Lightweight by default

Whitey should avoid becoming a complex platform. The default path should be simple:

```bash
whitey init
whitey run "implement JWT refresh token rotation"
```

Advanced features should be available only when needed.

### 6.4 Explicit over magical

Whitey should make orchestration visible. Agents, skills, hooks, policies, and provider routing should be stored in readable files.

### 6.5 Deterministic validation

AI output should be validated by deterministic tools wherever possible:

- Tests
- Type checks
- Linters
- Static analysis
- Secret scanning
- Dependency scanning
- Kubernetes dry-runs
- Custom scripts

### 6.6 Safe power

Whitey should let agents do useful work, but it should define clear boundaries around command execution, file changes, network calls, secrets, cluster access, and provider routing.

### 6.7 Memory with lifecycle

Memory should not be an uncontrolled text dump. Whitey should distinguish between:

- Short-term session notes
- Durable project facts
- Architectural decisions
- User preferences
- Known commands
- Risk notes
- Deprecated or expired memories

## 7. Core concepts

### 7.1 Agent

An agent is a role definition with a purpose, model/provider preference, tools, memory access, and policy boundaries.

Example agents:

- Planner
- Implementer
- Reviewer
- Security Reviewer
- Test Fixer
- Kubernetes Operator
- Documentation Writer
- Release Assistant
- Prompt Optimizer

An agent should define:

- Name
- Description
- System prompt or instruction block
- Allowed tools
- Allowed MCP servers
- Provider preference
- Maximum autonomy level
- Memory read/write permissions
- Hook events it can trigger
- Validation requirements

### 7.2 Skill

A skill is a reusable workflow package for a specific task.

Examples:

- Create a new API endpoint
- Review a pull request
- Generate tests
- Debug Kubernetes deployment
- Perform dependency upgrade
- Run security review
- Write migration plan
- Convert vague idea into implementation plan

A skill should include:

- Input contract
- Prompt template
- Required agent or agent group
- Required tools
- Required validation hooks
- Output format
- Memory write rules

### 7.3 Hook

A hook is a deterministic script or command that runs at a lifecycle event.

Hook examples:

- On session start: load project memory and recent decisions
- On prompt submit: detect secrets or unsafe instructions
- Before shell command: check command against policy
- After file edit: run formatter or lint check
- After agent completes: run tests and summarize result
- Before memory write: classify memory type and expiration
- On session stop: summarize work and update memory
- On Kubernetes tool call: enforce namespace policy

Hooks are one of the most important Whitey features because they turn agent behavior into a controlled workflow.

### 7.4 Policy

A policy defines what agents are allowed to do.

Policy examples:

- Which files can be edited
- Which commands are allowed, denied, or require confirmation
- Which providers can receive which data
- Which MCP tools are enabled
- Which Kubernetes namespaces can be inspected
- Whether secrets may be read
- Whether network access is allowed
- Maximum cost or token budget
- Whether an agent can modify production files

Policies should be readable, version-controlled, and testable.

### 7.5 Session

A session is a named unit of work.

A Whitey session should track:

- Goal
- Start time and end time
- Active agents
- Provider choices
- Workspace path
- Git branch or worktree
- Commands run
- Files changed
- Tools called
- Validation results
- Memory updates
- Final summary

Sessions make agent work recoverable and auditable.

### 7.6 Memory

Memory is structured project knowledge that survives beyond one prompt.

Memory categories:

- `session_summary`: what happened in a session
- `project_fact`: stable fact about the codebase
- `architecture_decision`: decision and rationale
- `user_preference`: developer-specific preference
- `command_recipe`: known command that works in the project
- `validation_result`: important test or scan result
- `risk_note`: known risk, vulnerability, or caution
- `todo`: follow-up item
- `deprecated`: stale memory kept for traceability but no longer active

Memory should have metadata:

```yaml
id: mem_2026_06_03_001
type: architecture_decision
scope: project
source_session: sess_auth_refactor_001
created_at: 2026-06-03T12:00:00Z
expires_at: null
confidence: high
owner: planner
summary: "The auth service should remain stateless; refresh tokens are stored hashed in the database."
```

### 7.7 MCP tool

An MCP tool connects the agent runtime to external context or actions.

Initial MCP targets:

- Context7 for current, version-specific library documentation
- Exa for web search, research, and code search
- Kubernetes MCP for cluster inspection and operations
- GitHub MCP for repository, issue, pull request, and CI context

Whitey should manage MCP tool configuration centrally so each agent does not need to reinvent tool setup.

### 7.8 Backend

The backend is how Whitey runs agents.

Initial backends:

1. tmux backend
   - Starts each agent in a tmux pane or window.
   - Good for local visibility and persistence.
   - Works well for developers who live in terminals.

2. Native subagent backend
   - Uses provider-native subagent capabilities where available.
   - Less shell orchestration.
   - Better integration with tools that already support agent delegation.

Future backends:

- Docker/devcontainer backend
- Remote runner backend
- CI backend
- Local queue backend

### 7.9 Provider

A provider is a model or agent runtime that can receive tasks.

Provider examples:

- `codex-deep`: strong planning and complex implementation
- `copilot-default`: IDE-centric coding support
- `gemini-fast`: small operational tasks and quick checks
- `claude-review`: long-context review and documentation
- `local-small`: private summarization or classification

Provider routing should be configurable and policy-aware.

## 8. Core feature set

### 8.1 Session management

Whitey should provide a consistent way to start, resume, list, inspect, and close development sessions.

Commands could look like:

```bash
whitey session start auth-refresh --goal "Implement refresh token rotation"
whitey session list
whitey session attach auth-refresh
whitey session status auth-refresh
whitey session close auth-refresh
```

Session management should support:

- Named sessions
- Git branch or worktree association
- tmux attach/detach
- Resume after terminal close
- Session logs
- Agent activity history
- Validation status
- Final summary generation

A session should not just be a terminal process. It should be a durable development record.

### 8.2 Memory management

Memory management should be automatic but inspectable.

Whitey should automatically:

- Load relevant memory at session start
- Capture important decisions during the session
- Summarize sessions at stop
- Write durable memory only after classification
- Avoid storing secrets
- Mark stale memories as deprecated
- Link memory to files, sessions, and agents

Memory commands:

```bash
whitey memory list
whitey memory search "auth"
whitey memory add --type project_fact "The API uses FastAPI and SQLModel."
whitey memory deprecate mem_123 --reason "Changed during auth refactor"
whitey memory compact
```

Memory should be stored in a format that is easy to review and version:

```text
.whitey/memory/
  project.md
  decisions/
  sessions/
  commands/
  risks/
  index.json
```

### 8.3 Hooks

Hooks should be first-class.

Important hook events:

```yaml
SessionStart
SessionStop
UserPromptSubmit
BeforeAgentRun
AfterAgentRun
BeforeSkillRun
AfterSkillRun
BeforeToolUse
AfterToolUse
BeforeShellCommand
AfterShellCommand
BeforeMemoryWrite
AfterMemoryWrite
BeforeProviderDispatch
AfterProviderDispatch
ValidationRequired
PolicyViolation
```

Example hook config:

```yaml
hooks:
  AfterAgentRun:
    - name: run-unit-tests
      when:
        agent: implementer
        files_changed: ["src/**", "tests/**"]
      command: "npm test"
      timeout_seconds: 120
      required: true

  BeforeShellCommand:
    - name: block-dangerous-shell
      command: "python .whitey/hooks/check_shell_command.py"
      required: true

  SessionStop:
    - name: summarize-session
      command: "whitey memory summarize-session"
      required: true
```

Hook goals:

- Keep memory updated
- Validate code automatically
- Enforce project policy
- Improve security
- Reduce manual repetition
- Make agent behavior auditable

### 8.4 Agents and skills registry

Whitey should keep agents and skills in one predictable place.

Proposed structure:

```text
.whitey/
  agents/
    planner.md
    implementer.md
    reviewer.md
    security.md
    kube-operator.md
  skills/
    plan-feature.md
    implement-feature.md
    review-diff.md
    debug-kubernetes.md
    security-check.md
```

Each agent or skill should be plain text or YAML-frontmatter markdown.

Example agent:

```markdown
---
name: planner
description: Breaks ambiguous development tasks into an implementation plan.
provider: codex-deep
tools: [filesystem, git, context7, exa]
can_edit_files: false
memory_read: [project_fact, architecture_decision, command_recipe]
memory_write: [architecture_decision, todo]
---

You are the Whitey Planner agent. Your job is to clarify the task, inspect the codebase, identify risks, and produce an implementation plan before code is changed.
```

Example skill:

```markdown
---
name: implement-feature
agent_sequence: [planner, implementer, reviewer]
required_hooks: [run-tests, update-memory]
output: implementation_summary
---

Use this skill when the user asks to implement a code change that touches application behavior.
```

### 8.5 MCP tools

Whitey should treat MCP as a standard tool layer rather than one-off config copied between IDEs.

Initial MCP integrations:

1. Context7
   - Use when library documentation matters.
   - Good for framework-specific implementation tasks.
   - Example: Next.js, FastAPI, Kubernetes clients, Terraform providers.

2. Exa
   - Use when current web research, code examples, or external documentation are needed.
   - Good for recent APIs, release notes, troubleshooting, and technical comparisons.

3. Kubernetes MCP
   - Use for cluster status, pods, services, events, logs, and safe operational checks.
   - Must be policy-restricted by namespace, context, and operation type.

4. GitHub MCP
   - Use for issues, pull requests, CI, repository metadata, and review context.

MCP config should support:

- Project-level servers
- User-level servers
- Tool allowlists per agent
- Secret/environment variable injection
- Read-only and write-capable modes
- Toolset filtering
- Audit logs

Example:

```yaml
mcp:
  servers:
    context7:
      type: remote
      url: "https://mcp.context7.com/mcp"
      tools: ["resolve-library-id", "get-library-docs"]

    exa:
      type: remote
      url: "https://mcp.exa.ai/mcp"
      tools: ["web_search", "code_search"]

    kubernetes-dev:
      type: local
      command: "npx"
      args: ["kubernetes-mcp-server@latest"]
      tools: ["pods", "services", "events", "logs"]
      policy: "kubernetes-dev-readonly"
```

### 8.6 Provider routing and delegation

Whitey should be able to delegate tasks to different providers based on task type, complexity, cost, privacy, and tool needs.

Example routing rules:

```yaml
routing:
  rules:
    - match:
        task_type: deep_planning
      provider: codex-deep
      reason: "Use strongest reasoning model for architecture and risk analysis."

    - match:
        task_type: kubernetes_check
      provider: gemini-fast
      tools: [kubernetes-dev]
      reason: "Operational status checks are small and should be fast."

    - match:
        task_type: security_review
      provider: codex-deep
      agent: security
      required_hooks: [secret-scan, dependency-audit]

    - match:
        task_type: memory_summarization
      provider: local-small
      reason: "Keep session summarization cheap and private."
```

Routing should consider:

- Required reasoning depth
- Required context length
- Tool availability
- Cost
- Latency
- Data sensitivity
- Whether code or secrets may be shared
- Whether the task needs internet access
- Whether the task changes files

Example delegation:

```bash
whitey delegate --to planner "Create a migration plan for moving auth to OAuth2"
whitey delegate --to kube-operator "Check why dev pods are restarting"
whitey delegate --task-type security_review "Review this diff before merge"
```

### 8.7 Prompt optimization

Whitey should include a prompt optimization layer, but it should be practical, not abstract.

The prompt optimizer should:

- Turn vague requests into structured tasks
- Add project context from memory
- Add relevant policy constraints
- Add output format requirements
- Add validation requirements
- Select the right skill
- Select the right agent
- Select the right provider
- Keep prompts shorter by injecting only relevant context

Example:

User prompt:

```text
Fix login bug.
```

Whitey optimized task:

```text
Goal: Diagnose and fix the login bug.

Known project context:
- Auth service uses JWT access tokens and hashed refresh tokens.
- Login route is implemented in src/auth/routes.ts.
- Tests are run with npm test.

Process:
1. Inspect recent changes and failing tests.
2. Identify root cause.
3. Make the smallest safe code change.
4. Add or update tests.
5. Run npm test.
6. Summarize changed files and validation results.

Constraints:
- Do not change token expiration policy without planner approval.
- Do not read .env files.
- Do not modify production Kubernetes manifests.
```

This feature helps make agents more reliable without requiring the developer to write perfect prompts.

### 8.8 Policies and safety

Whitey should include a small policy engine from the beginning.

Policy areas:

- Shell commands
- File writes
- Git operations
- Network access
- MCP tool use
- Kubernetes actions
- Secrets
- Provider routing
- Memory writes
- Autonomy level

Example policy:

```yaml
policies:
  shell:
    deny:
      - "rm -rf /"
      - "curl * | sh"
      - "kubectl delete * --all"
    require_confirmation:
      - "git push *"
      - "npm publish *"
      - "terraform apply *"
      - "kubectl apply *"
    allow:
      - "npm test"
      - "npm run lint"
      - "git diff"
      - "git status"

  files:
    deny_write:
      - ".env"
      - ".env.*"
      - "secrets/**"
      - "infra/prod/**"

  kubernetes:
    allowed_contexts: ["dev", "staging"]
    denied_contexts: ["prod"]
    default_mode: readonly
```

Policy should not be only advisory. Hooks should enforce it before tool calls and commands.

### 8.9 Observability and audit trail

Whitey should log what happened in a way developers can inspect.

Track:

- Prompt submitted
- Optimized prompt
- Agent selected
- Provider selected
- Tools called
- Commands run
- Files changed
- Hooks triggered
- Validation results
- Policy violations
- Memory changes
- Final answer

Example:

```bash
whitey session inspect auth-refresh
whitey logs tail
whitey audit show --session auth-refresh
```

This matters because multi-agent work can become hard to debug. Whitey should make the agent runtime explainable.

## 9. Example local workflow

### 9.1 Feature implementation

```bash
whitey session start refresh-token-rotation \
  --goal "Implement refresh token rotation and update tests"
```

Whitey does the following:

1. Creates or attaches to a session.
2. Loads relevant memory.
3. Runs the planner agent.
4. Uses Context7 if current library docs are needed.
5. Produces a plan.
6. Sends implementation to the implementer agent.
7. Runs hooks after file changes.
8. Runs tests and lint.
9. Sends diff to reviewer agent.
10. Writes session summary to memory.

Developer result:

- Less manual prompting
- More consistent validation
- Better context reuse
- Cleaner final summary

### 9.2 Kubernetes debugging

```bash
whitey run --skill debug-kubernetes "Why is the payments service restarting in dev?"
```

Whitey does the following:

1. Routes task to `kube-operator`.
2. Uses a low-cost fast provider if configured.
3. Enables only read-only Kubernetes MCP tools.
4. Checks pods, events, logs, and deployment status.
5. Blocks destructive commands.
6. Produces a diagnosis and safe next steps.

### 9.3 Security review after implementation

```bash
whitey run --skill security-check "Review current diff before PR"
```

Whitey does the following:

1. Reads git diff.
2. Runs security reviewer agent.
3. Runs deterministic hooks:
   - secret scan
   - dependency audit
   - static analysis
   - policy check
4. Produces a risk report.
5. Writes important risks to memory if approved.

## 10. Proposed project structure

```text
.whitey/
  config.yaml

  agents/
    planner.md
    implementer.md
    reviewer.md
    security.md
    kube-operator.md

  skills/
    plan-feature.md
    implement-feature.md
    review-diff.md
    debug-kubernetes.md
    security-check.md
    write-docs.md

  hooks/
    check_shell_command.py
    run_tests.sh
    run_lint.sh
    secret_scan.sh
    summarize_session.py
    classify_memory.py

  policies/
    default.yaml
    kubernetes-dev-readonly.yaml
    security.yaml

  memory/
    project.md
    decisions/
    sessions/
    commands/
    risks/
    index.json

  sessions/
    sess_2026_06_03_auth_refresh/
      session.yaml
      transcript.md
      tool_calls.jsonl
      commands.jsonl
      validation.jsonl
      summary.md

  providers/
    copilot.yaml
    codex.yaml
    gemini.yaml
    local.yaml

  mcp/
    servers.yaml

  logs/
    whitey.log
```

## 11. Example root config

```yaml
project:
  name: my-app
  whitey_version: "0.1"
  default_backend: tmux
  default_skill: implement-feature

backends:
  tmux:
    enabled: true
    session_prefix: whitey
  native_subagents:
    enabled: true
    provider_priority: [copilot, codex]

providers:
  default: copilot-default
  profiles:
    copilot-default:
      type: copilot
      autonomy: medium
      max_cost: normal

    codex-deep:
      type: codex
      reasoning: high
      autonomy: medium

    gemini-fast:
      type: gemini
      reasoning: low
      autonomy: low

    local-small:
      type: local
      model: local-summary
      autonomy: low

memory:
  enabled: true
  auto_load: true
  auto_summarize_on_stop: true
  require_classification: true
  deny_secret_storage: true

hooks:
  enabled: true
  config: .whitey/hooks.yaml

policies:
  default: .whitey/policies/default.yaml

mcp:
  config: .whitey/mcp/servers.yaml

routing:
  config: .whitey/routing.yaml
```

## 12. MVP scope

The MVP should be intentionally small.

### 12.1 MVP features

1. `whitey init`
   - Creates `.whitey/` structure.
   - Installs default agents, skills, hooks, and policies.

2. Session management
   - Start, list, attach, inspect, close.
   - tmux backend first.

3. Basic agents
   - Planner
   - Implementer
   - Reviewer
   - Security Reviewer
   - Kubernetes Operator

4. Basic skills
   - Plan feature
   - Implement feature
   - Review diff
   - Debug Kubernetes
   - Security check

5. Hook runner
   - Session start
   - Session stop
   - Before shell command
   - After agent run
   - Before memory write

6. Memory store
   - Markdown plus JSON index.
   - Automatic session summary.
   - Manual memory search.

7. Provider profiles
   - Configurable provider commands.
   - Simple routing rules.

8. MCP registry
   - Context7
   - Exa
   - Kubernetes MCP
   - GitHub MCP later if not in initial build

9. Policy checks
   - Shell command allow/deny.
   - File write deny list.
   - Kubernetes read-only policy.

10. Audit logs
   - Commands, tool calls, hooks, validation results.

### 12.2 MVP non-goals

Whitey should not initially include:

- Web dashboard
- Cloud service
- Marketplace
- Complex GUI
- Full plugin ecosystem
- Enterprise admin console
- Complex distributed execution
- Automatic production operations
- Unbounded autonomous execution

## 13. Roadmap

### Phase 0 - Definition

- Finalize project name and positioning.
- Define file structure.
- Define config schema.
- Define lifecycle events.
- Define provider adapter interface.
- Define policy model.

### Phase 1 - Local runtime MVP

- Implement CLI.
- Implement `.whitey/` project initialization.
- Implement tmux backend.
- Implement session metadata.
- Implement basic hook runner.
- Implement memory summary files.
- Implement default agents and skills.

### Phase 2 - Provider and MCP adapters

- Add Copilot adapter.
- Add Codex adapter.
- Add Gemini adapter.
- Add generic command provider adapter.
- Add MCP registry support.
- Add Context7, Exa, and Kubernetes MCP presets.

### Phase 3 - Policy and validation

- Add shell policy enforcement.
- Add file policy enforcement.
- Add Kubernetes policy enforcement.
- Add validation hook templates.
- Add security hook templates.
- Add audit reports.

### Phase 4 - Better orchestration

- Add native subagent backend.
- Add multi-agent task graph.
- Add parallel delegation.
- Add dependency-aware tasks.
- Add prompt optimizer.
- Add provider cost and latency tracking.

### Phase 5 - Sharing and ecosystem

- Add reusable skill packs.
- Add project templates.
- Add team-level policy bundles.
- Add import/export for agents and skills.
- Add optional dashboard or TUI.

## 14. How Whitey helps developers

### Faster local development

Whitey removes repeated setup work. The developer does not need to explain the same project facts, commands, policies, and validation steps every time.

### Better code quality

Hooks ensure tests, linters, formatters, and security checks run consistently after agent work.

### Better use of models

Provider routing lets expensive or high-reasoning models handle deep planning while cheaper or faster models handle small operational tasks.

### Safer tool use

Policies and hooks reduce the risk of dangerous shell commands, unsafe Kubernetes actions, accidental secret exposure, and uncontrolled memory writes.

### Stronger continuity

Session summaries and structured memory let the project accumulate useful context over time.

### Less vendor lock-in

Adapters allow Whitey to start with Copilot but support Codex, Gemini, Claude, and other providers later.

### More transparent agent behavior

Audit logs and session inspection make it easier to understand what agents did and why.

## 15. Security model

Whitey should assume that agentic development is useful but risky.

Security risks to consider:

- Prompt injection
- Tool misuse
- Excessive agency
- Sensitive information disclosure
- Unsafe plugin or MCP server behavior
- Memory poisoning
- Insecure shell execution
- Overbroad Kubernetes access
- Provider leakage of private code or secrets

Whitey should mitigate these risks with:

- Hook trust model
- Command policy checks
- Tool allowlists
- Memory classification
- Secret redaction
- Provider data-sensitivity rules
- Read-only defaults for operational tools
- Human approval for risky actions
- Session audit logs
- Separate policies for dev, staging, and production

Security should be designed into the runtime, not added later.

## 16. Possible CLI design

```bash
# Initialize project
whitey init

# Run a task with default skill routing
whitey run "Add pagination to the users endpoint"

# Run with explicit skill
whitey run --skill review-diff "Review current git diff"

# Start named session
whitey session start users-pagination --goal "Add pagination to users endpoint"

# Attach to running tmux session
whitey session attach users-pagination

# Delegate to specific agent
whitey delegate --to planner "Plan migration from REST to GraphQL"

# Check Kubernetes through restricted MCP policy
whitey run --skill debug-kubernetes "Check why api pods restart in dev"

# Inspect memory
whitey memory search "auth"

# Run hook diagnostics
whitey hooks doctor

# Show policy decision for a command
whitey policy check --command "kubectl delete pod api-123"

# Show session audit trail
whitey audit show --session users-pagination
```

## 17. Success criteria

Whitey is successful if it makes local AI-assisted development:

- Faster
- More consistent
- Easier to resume
- Easier to validate
- Safer to automate
- Less dependent on one provider
- Easier to explain and audit

Concrete success metrics:

- A developer can initialize Whitey in a repo in under five minutes.
- A developer can run a feature workflow with planning, implementation, review, validation, and memory summary from one command.
- Risky shell commands are blocked or require approval.
- Sessions can be resumed after terminal restart.
- Important project decisions are captured automatically.
- Kubernetes debug tasks run in read-only mode by default.
- Provider routing can send deep planning to one provider and simple checks to another.

## 18. Open questions

1. Should Whitey be a CLI-only tool at first, or should it include a TUI?
2. Should project memory be committed to the repository, kept local, or split between shared and private memory?
3. How should Whitey map provider-specific concepts like Copilot custom agents, Codex subagents, and Gemini CLI workflows into one common model?
4. Should hooks be pure shell commands, or should Whitey provide a plugin SDK?
5. How strict should provider data-sensitivity policies be by default?
6. Should Kubernetes MCP be read-only by default even in development?
7. Should Whitey support automatic git worktree creation per session?
8. Should the current project name be treated as internal only until a naming and branding review is completed?

## 19. External ecosystem context

The following tools and documentation influenced the direction of Whitey:

- Oh My Codex: demonstrates an enhanced Codex workflow with agent teams, hooks, skills, scoped guidance, and durable state.
- Model Context Protocol: provides a standard way for agents and AI applications to access external tools, context, and actions.
- OpenAI Codex hooks: show how deterministic lifecycle scripts can be used for logging, memory, validation, and policy enforcement.
- GitHub Copilot custom agents and MCP configuration: show that Copilot workflows can be customized with agents and MCP tool access.
- tmux: provides a proven local backend for persistent terminal sessions, panes, and reconnectable workflows.
- Context7 MCP: provides current, version-specific documentation and code examples for coding assistants.
- Exa MCP: provides AI-oriented web search, code search, and research capabilities.
- Kubernetes MCP servers: expose Kubernetes inspection and management capabilities through MCP, which makes policy enforcement important.
- OWASP GenAI and Agentic AI guidance: highlights risks such as prompt injection, insecure plugin design, tool misuse, excessive agency, and sensitive information disclosure.

Reference URLs:

- https://github.com/Yeachan-Heo/oh-my-codex
- https://modelcontextprotocol.io/docs/getting-started/intro
- https://developers.openai.com/codex/hooks
- https://docs.github.com/en/copilot/reference/custom-agents-configuration
- https://learn.microsoft.com/en-us/agent-framework/agents/providers/github-copilot
- https://tmux.app/doc/
- https://context7.com/docs/overview
- https://exa.ai/mcp
- https://github.com/containers/kubernetes-mcp-server/
- https://owasp.org/www-project-top-10-for-large-language-model-applications/
- https://genai.owasp.org/2025/12/09/owasp-genai-security-project-releases-top-10-risks-and-mitigations-for-agentic-ai-security/

## 20. Final product definition

Whitey is a lightweight local development orchestration layer for AI coding agents.

It gives a developer one central place to configure agents, skills, hooks, memory, policies, MCP tools, sessions, and provider routing. It is designed for fast local development, safe automation, and provider flexibility.

Whitey should start small: a CLI, a `.whitey/` folder, a tmux backend, a few default agents, a hook runner, structured memory, MCP presets, and policy enforcement. From there, it can evolve into a stronger orchestration layer with native subagents, richer provider routing, prompt optimization, and reusable skill packs.

The main value is not adding more AI features. The value is making AI-assisted development repeatable, safe, inspectable, and fast.
