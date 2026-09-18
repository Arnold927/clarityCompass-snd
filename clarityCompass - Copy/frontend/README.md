# ClarityCompass NGO

This is a Next.js application built to serve as a comprehensive project management and M&E (Monitoring and Evaluation) platform for Non-Governmental Organizations (NGOs).

## Features

- **Strategic Planning**: Define strategic plans, objectives, and corporate indicators.
- **Program & Project Management**: Create and manage programs and projects, linking them to strategic goals.
- **Results Framework**: Build detailed results frameworks from the strategic level down to project activities.
- **Task Management**: A calendar-based task manager to assign and track project activities.
- **Data Collection**: A dynamic form builder and data collection system.
- **AI-Powered Reporting**: Generate detailed narrative reports from project data using AI.
- **AI-Powered Evaluation**: Get an automated health check on your projects.

## Tech Stack

- **Framework**: Next.js (App Router)
- **UI**: React, TypeScript, Tailwind CSS
- **Components**: ShadCN UI
- **Generative AI**: Google Gemini via Genkit

## Getting Started

First, install the dependencies:

```bash
npm install
```

Next, create a `.env` file in the root of the project and add your Google Gemini API key:

```
GOOGLE_API_KEY="YOUR_API_KEY_HERE"
```

Then, run the development server for the Next.js app:

```bash
npm run dev
```

In a separate terminal, run the Genkit development server:

```bash
npm run genkit:dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
