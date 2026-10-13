<!-- InsightFlow README: blue-accented project overview -->

<div align="center">

# 🔷 InsightFlow

### Feedback Analyzer

**Turn customer feedback into clearer insights and actionable next steps.**

<p>
  <img src="https://img.shields.io/badge/Feedback-Analyzer-2563EB?style=for-the-badge&labelColor=0F172A" alt="Feedback Analyzer" />
  <img src="https://img.shields.io/badge/React-18-2563EB?style=for-the-badge&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-Enabled-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-0EA5E9?style=for-the-badge" alt="MIT License" />
</p>

[Explore the repository](https://github.com/prachisingh24-ctrl/InsightFlow) · [Read the license](./LICENSE)

</div>

---

## 💡 About the project

**InsightFlow** is a web application designed to help organize customer feedback and make it easier to explore patterns, reports, and follow-up actions. It brings feedback review, insights, reporting, and alerts together in one interface, with a demo entry point for exploring the product.

## ✨ Features

<table>
  <tr>
    <td width="50%">
      <h3>📊 Dashboard</h3>
      A central overview of feedback activity.
    </td>
    <td width="50%">
      <h3>💬 Feedback workspace</h3>
      Review and manage customer feedback.
    </td>
  </tr>
  <tr>
    <td>
      <h3>🔎 Insights</h3>
      Explore patterns and summarized feedback signals.
    </td>
    <td>
      <h3>🧾 Reports</h3>
      View reports and access shared reports.
    </td>
  </tr>
  <tr>
    <td>
      <h3>🔔 Alerts</h3>
      Review feedback-related alerts.
    </td>
    <td>
      <h3>🔁 Adaptation workflow</h3>
      Support follow-up actions based on feedback.
    </td>
  </tr>
  <tr>
    <td>
      <h3>🚀 Demo mode</h3>
      Explore the interface without signing in, where supported by the app.
    </td>
    <td>
      <h3>📱 Responsive UI</h3>
      A modern interface built with React and reusable components.
    </td>
  </tr>
</table>

> [!NOTE]
> Available data, integrations, and behavior depend on the configured environment and connected services. Never commit API keys, passwords, or other secrets.

## 🧰 Tech stack

<p>
  <img src="https://img.shields.io/badge/React-2563EB?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=reactrouter&logoColor=white" alt="React Router" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Recharts-2563EB?style=flat-square" alt="Recharts" />
  <img src="https://img.shields.io/badge/ZiteJS-0F172A?style=flat-square" alt="ZiteJS" />
</p>

- **React 18 + TypeScript** — component-based user interface and type safety.
- **Vite** — local development server and production build tooling.
- **React Router** — client-side navigation.
- **Tailwind CSS + shared UI components** — styling and reusable interface elements.
- **Recharts** — data visualization.
- **ZiteJS** — configured platform and authentication integration.

## 🗂️ Project structure

~~~text
InsightFlow/
├── apps/
│   ├── insightflow/        # Main InsightFlow application
│   └── insightflow-copy/   # Additional app copy/variant
├── packages/
│   └── components/         # Shared UI components
├── package.json            # Workspace scripts and dependencies
├── package-lock.json
├── README.md
└── LICENSE                 # MIT License
~~~

## ⚡ Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) — use a current LTS release.
- [Yarn Classic](https://classic.yarnpkg.com/) 1.x — the repository declares Yarn 1.22.22.

### 1. Clone the repository

~~~bash
git clone https://github.com/prachisingh24-ctrl/InsightFlow.git
cd InsightFlow
~~~

### 2. Install dependencies

Run from the repository root:

~~~bash
yarn install
~~~

### 3. Start the main app

~~~bash
yarn workspace @project/insightflow dev
~~~

Vite will print a local URL in your terminal (usually <code>http://localhost:5173</code>). Open it in your browser.

### 4. Create a production build

~~~bash
yarn workspace @project/insightflow build
~~~

### Run the app copy

The copied app has its own workspace package. Check <code>apps/insightflow-copy/package.json</code> for its workspace name and scripts before starting it.

## ⚙️ Configuration & safety

Some features may require environment variables or external service configuration. Check the app source and platform settings for the required setup.

- Keep credentials in local environment files or your deployment provider's secret manager.
- Do not commit real secrets or private user data.
- Confirm required services are configured before deploying.

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Create a branch for your change.
2. Make the change and test the affected workflow.
3. Keep secrets and generated build output out of commits.
4. Open a pull request with a clear description.

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for the complete license text.

---

<div align="center">

**Built with 💙 for better feedback workflows**

<sub>InsightFlow · Feedback Analyzer</sub>

</div>
