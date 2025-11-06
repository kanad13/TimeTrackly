# Local Setup and Execution Guide

- **TimeTrackly** runs as a local application on your machine using Node.js
- The application features a modular architecture with robust error handling to ensure your data remains private and provides a consistent experience across all browsers

![](/assets/010-ui_initial_load.png)
_The clean, Material Design-inspired interface after setup_

## 1. Prerequisites

- **Node.js:** You must have Node.js installed on your system (v13 or higher recommended)
  - You can download it from [nodejs.org](https://nodejs.org/)

## 2. First-Time Setup

- **Open Terminal:** Navigate to the project directory (`time-tracker`) in your terminal or command prompt
- **Install Dependencies:** Run the following command
  - Note: This project has no external dependencies, but this is a standard step

```bash
npm install
```

- Upon first startup, the server will automatically create the necessary data files if they don't exist: `mtt-data.json`, `mtt-active-state.json`, and `mtt-suggestions.json`

## 3. Running the Application

- There are multiple ways to run the server:

### 3.1. Standard Mode (Recommended for general use)

- **Start the Server:** In your terminal, run:

```bash
npm start
```

**(Optional: Start with a custom port)**
You can start the server on a different port by setting the `PORT` environment variable:

```bash
PORT=3000 npm start
```

This will run the app on `http://localhost:3000` (replace `3000` with your desired port).

- **Access the App:** Open your web browser and navigate to `http://localhost:13331`
- **Stop the Server:** Go back to the terminal and press `Ctrl + C`
- If you get an error like "port already in use", you can do either of 2 things:
  - Find the existing process using the port and terminate it with the command `lsof -ti:13331 | xargs kill -9` OR
  - Change the port by starting the server with a different port (see above), or by editing the port in `server.cjs` file

### 3.2. Development Mode (With detailed logging)

- **Start in Dev Mode:** In your terminal, run:

```bash
npm run dev
```

- This mode provides more verbose logging to help debug issues

### 3.3. Background Mode with PM2 (For continuous use)

- **PM2** is a process manager for Node.js that will keep your server running in the background
- This is a "fire-and-forget" solution
- **Install PM2 (One-time only):**
  ```bash
  npm install pm2 -g
  ```
- **Start the Server with PM2:** In the project directory, run:
  ```bash
  pm2 start server.cjs --name "time-trackly"
  ```
- **Manage the Process:**
  - **View Status:** `pm2 list`
  - **Stop the Server:** `pm2 stop time-trackly`
  - **Restart the Server:** `pm2 restart time-trackly`
  - **View Logs:** `pm2 logs time-trackly`
- **Save the Process:** To make `PM2` automatically restart the server after a system reboot, run:
  ```bash
  pm2 save
  ```

## 4. Health Check and Monitoring

- The server includes a health endpoint to verify the application is running correctly
- **Check Server Health:**
  ```bash
  npm run health
  ```
- This will display the server status, uptime, and confirm all data files are accessible

## 5. Backup Your Data

- You can create manual backups of your time tracking data
- **Create Backup:**

```bash
npm run backup
```

- This copies all `mtt-*.json` files to a timestamped backup directory
- However, since you're using Git, regular commits provide automatic versioning of your data files

## 6. Customizing Your Suggestions

- You can easily edit your list of default "Project / Task" suggestions
- **Open the File:** In the project's root directory, open the `mtt-suggestions.json` file with any text editor
- **Edit the Contents:**
  - Add, remove, or modify the string entries in the JSON array
  - Make sure to maintain the correct JSON format
- **Save and Refresh:**
  - Save the file and simply refresh your browser window
  - The new suggestions will appear in the input dropdown
  - No server restart is required

## 7. Verify Your Installation

After setup, verify the application works:

```bash
# With the server running, check the health endpoint
npm run health
```

You should see a response showing status "ok" and all data files accessible.

Optionally, run the test suite:

```bash
npm test
```

For detailed testing information, see `tests/README.md`.

## 8. Using the Application

Once running, you can track time across multiple projects simultaneously:

- ![](/assets/010-ui_initial_load.png)
