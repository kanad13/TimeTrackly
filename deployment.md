# Local Setup and Execution Guide

The Multi-Task Time Tracker (MTTT)  runs as a local application on your machine using Node.js. This ensures your data remains private and provides a consistent experience across all browsers.

## 1. Prerequisites

- **Node.js:** You must have Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

## 2. First-Time Setup

1.  **Open Terminal:** Navigate to the project directory (`mttt-tracker`) in your terminal or command prompt.
2.  **Install Dependencies:** Run the following command. (Note: This project has no external dependencies, but this is a standard step).
    `npm install`

## 3. Running the Application

There are two ways to run the server:

### A) Standard Mode (Recommended for general use)

1.  **Start the Server:** In your terminal, run:
    `npm start`
2.  **Access the App:** Open your web browser and navigate to `http://localhost:3000`.
3.  To stop the server, go back to the terminal and press `Ctrl + C`.

### B) Background Mode with PM2 (For continuous use)

PM2 is a process manager for Node.js that will keep your server running in the background. This is a "fire-and-forget" solution.

1.  **Install PM2 (One-time only):**
    `npm install pm2 -g`

2.  **Start the Server with PM2:** In the project directory, run:
    `pm2 start server.js --name "mttt-tracker"`

3.  **Manage the Process:**

    - **View Status:** `pm2 list`
    - **Stop the Server:** `pm2 stop mttt-tracker`
    - **Restart the Server:** `pm2 restart mttt-tracker`
    - **View Logs:** `pm2 logs mttt-tracker`

4.  **Save the Process:** To make PM2 automatically restart the server after a system reboot, run:
    `pm2 save`
