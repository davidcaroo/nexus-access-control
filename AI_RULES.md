# AI Development Rules for Nexus Access Control

This document provides guidelines for the AI developer to ensure consistency, maintainability, and adherence to the project's architecture.

## Tech Stack Overview

This is a modern web application built with the following technologies:

-   **Framework:** React 19 with TypeScript for type safety and robust component-based architecture.
-   **Build Tool:** Vite for fast development and optimized builds.
-   **Styling:** Tailwind CSS for a utility-first styling approach. All styling should be done with Tailwind classes.
-   **Routing:** React Router (`react-router-dom`) for all client-side routing and navigation.
-   **UI Components:** A custom, lightweight component library is located in `src/components/UIComponents.tsx`.
-   **Icons:** `lucide-react` is the exclusive library for all icons used in the application.
-   **Charts & Data Visualization:** `recharts` is used to create responsive and interactive charts.
-   **AI Integration:** The Google Gemini API (`@google/genai`) is used for all AI-powered features, such as image analysis.
-   **State Management:** Global state is managed via the React Context API (`AppContext` in `App.tsx`).
-   **Data Persistence:** Mock data and user sessions are persisted in the browser's `localStorage`.

## Library Usage Rules

To maintain a clean and predictable codebase, please follow these rules strictly:

1.  **UI Components:**
    -   **DO** use the existing components from `src/components/UIComponents.tsx` (e.g., `Button`, `Input`, `Card`, `Badge`) for all standard UI elements.
    -   **DO NOT** create custom one-off buttons or inputs in pages. If a new variant is needed, consider extending the existing components.
    -   **DO** create new reusable components in the `src/components/` directory if the required functionality does not exist.

2.  **Styling:**
    -   **DO** use Tailwind CSS utility classes directly in your JSX.
    -   **DO NOT** write custom CSS files or use inline `style` objects unless absolutely necessary for dynamic properties that cannot be handled by Tailwind.

3.  **Icons:**
    -   **DO** import all icons from `lucide-react`.
    -   **DO NOT** install or use any other icon libraries to maintain visual consistency.

4.  **State Management:**
    -   **DO** use `useContext(AppContext)` to access and manipulate global data like employees, records, and authentication state.
    -   **DO NOT** introduce other state management libraries (e.g., Redux, Zustand, MobX). Local component state should be managed with `useState`.

5.  **Routing:**
    -   **DO** define all page routes within the `<Routes>` component in `src/App.tsx`.
    -   **DO** use the `<Link>` or `<NavLink>` components from `react-router-dom` for internal navigation.

6.  **AI Services:**
    -   **DO** keep all interactions with the Gemini API within the `src/services/` directory.
    -   **DO NOT** make direct API calls to Gemini from within your React components. Abstract this logic into service functions like `analyzeIDCard`.

7.  **Charts:**
    -   **DO** use components from the `recharts` library for any data visualization needs.
    -   **DO NOT** use other charting libraries like Chart.js or D3.js.