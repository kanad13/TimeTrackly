// server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DATA_FILE_PATH = path.join(__dirname, "mtt-data.json");

// --- Pre-flight Check: Ensure data file exists on startup ---
// This prevents errors on the very first run.
if (!fs.existsSync(DATA_FILE_PATH)) {
	console.log("Data file not found. Creating 'mtt-data.json'...");
	fs.writeFileSync(DATA_FILE_PATH, "[]", "utf8");
}

const server = http.createServer((req, res) => {
	// --- API Endpoint: /api/data ---
	if (req.url === "/api/data") {
		// GET: Read and return all data from the JSON file.
		if (req.method === "GET") {
			fs.readFile(DATA_FILE_PATH, "utf8", (err, data) => {
				if (err) {
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ message: "Error reading data file" }));
					return;
				}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(data);
			});
		}
		// POST: Receive new data and overwrite the JSON file.
		else if (req.method === "POST") {
			let body = "";
			req.on("data", (chunk) => {
				body += chunk.toString();
			});
			req.on("end", () => {
				fs.writeFile(DATA_FILE_PATH, body, "utf8", (err) => {
					if (err) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ message: "Error writing to data file" }));
						return;
					}
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ message: "Data saved successfully" }));
				});
			});
		}
		return;
	}

	// --- Static File Server: Serve index.html ---
	if (req.url === "/" || req.url === "/index.html") {
		fs.readFile(path.join(__dirname, "index.html"), (err, content) => {
			if (err) {
				res.writeHead(500);
				res.end("Critical Error: Could not load index.html");
				return;
			}
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(content);
		});
		return;
	}

	// --- 404 Not Found for any other request ---
	res.writeHead(404, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ message: "Endpoint not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
	console.log(`✅ MTTT Server is running.`);
	console.log(`   Open your browser and navigate to http://localhost:${PORT}`);
});
