/**
 * Test Environment Setup
 *
 * PURPOSE:
 * Initializes a browser-like environment using JSDOM for testing
 * frontend modules that depend on browser APIs.
 *
 * WHY JSDOM:
 * - Frontend code uses browser APIs (crypto.randomUUID, document, window)
 * - Node.js doesn't have these APIs natively
 * - JSDOM simulates a browser environment in Node.js
 * - Allows testing ES6 modules without transpilation
 *
 * WHAT'S PROVIDED:
 * - window: Browser window object
 * - document: DOM document object
 * - crypto: Web Crypto API (includes randomUUID)
 * - Other browser globals as needed
 *
 * USAGE:
 * Import this file at the top of test files BEFORE importing modules
 * that depend on browser APIs:
 *
 * import "./setup.mjs";
 * import * as utils from "../../js/utils.js";
 */

import { JSDOM } from "jsdom";

// Create a minimal HTML document
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
	url: "http://localhost",
	pretendToBeVisual: true,
});

// Set up global browser objects
global.window = dom.window;
global.document = dom.window.document;

// Use Object.defineProperty for read-only globals
Object.defineProperty(global, "navigator", {
	value: dom.window.navigator,
	writable: true,
	configurable: true,
});

// Set up crypto API with randomUUID support
Object.defineProperty(global, "crypto", {
	value: {
		randomUUID: () => {
			// Generate RFC4122 v4 UUID
			return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
				const r = (Math.random() * 16) | 0;
				const v = c === "x" ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			});
		},
		// Add other crypto methods if needed
		getRandomValues: (arr) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		},
	},
	writable: true,
	configurable: true,
});

// Clean up after each test suite (optional but good practice)
process.on("exit", () => {
	dom.window.close();
});
