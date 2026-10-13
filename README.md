# InsightFlow

**InsightFlow Feedback Analyzer** is a web application for organizing customer feedback and turning it into actionable insights. It brings feedback, analytics, reports, alerts, and follow-up/adaptation workflows into one interface, with a demo entry point for exploring the product.

## Features

- **Dashboard** — a central overview of feedback activity.
- **Feedback workspace** — review and manage feedback.
- **Insights** — explore patterns and summarized feedback signals.
- **Reports** — view reports and access shared reports.
- **Alerts** — review feedback-related alerts.
- **Adaptation workflow** — support follow-up actions based on feedback.
- **Demo mode** — explore the interface without signing in, where supported by the app.
- **Responsive UI** — built with React and reusable shared components.

> Note: Available data, integrations, and behavior depend on the configured environment and connected services. Do not put API keys or other secrets in source control.

## Tech stack

- React 18 and TypeScript
- Vite
- React Router
- Tailwind CSS and shared UI components
- Recharts for data visualizations
- ZiteJS for the project's configured platform/auth integration

## Repository structure

```text
.
├── apps/
│   ├── insightflow/       # Main InsightFlow application
│   └── insightflow-copy/  # Additional app copy/variant
├── packages/
│   └── components/        # Shared UI components
├── package.json           # Workspace scripts and dependencies
├── package-lock.json
└── README.md
```

## Getting started

### Prerequisites

- Node.js (use a current LTS release)
- Yarn 1.x (the repository declares Yarn 1.22.22)

### Install dependencies

From the repository root:

```bash
yarn install
```

### Run the main app locally

```bash
yarn workspace @project/insightflow dev
```

Vite will print a local URL in the terminal (usually `http://localhost:5173`). Open that URL in your browser.

### Build for production

```bash
yarn workspace @project/insightflow build
```

### Run the app copy

The copied app has its own workspace package. Check its `package.json` for the workspace name and scripts before starting it.

## Configuration

Some features may require environment variables or external service configuration. Check the app's source and platform settings for the required keys and setup instructions. Keep credentials in local environment files or your deployment provider's secret manager; never commit real secrets.

## Development notes

- The repository is organized as a Yarn workspace monorepo.
- Shared interface components live in `packages/components`.
- The main application source lives in `apps/insightflow`.
- If a command fails, verify your Node.js/Yarn versions and install dependencies from the repository root.

## Contributing

1. Create a branch for your change.
2. Make the change and test the affected workflow.
3. Keep secrets and generated build output out of commits.
4. Open a pull request with a clear description of the change.

## License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for the full license text.
