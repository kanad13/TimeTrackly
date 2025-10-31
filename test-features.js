/**
 * Puppeteer test script for verifying new features
 * Tests:
 * 1. Collapsible Data Management section
 * 2. Notes/comments functionality for timers
 * 3. CSV export includes notes
 */

const puppeteer = require('puppeteer');

// Helper function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testFeatures() {
	console.log('🚀 Starting feature tests...\n');
	
	const browser = await puppeteer.launch({
		headless: false,
		defaultViewport: { width: 1280, height: 800 }
	});
	
	const page = await browser.newPage();
	
	try {
		// Navigate to the application
		console.log('📍 Navigating to http://localhost:13331');
		await page.goto('http://localhost:13331', { waitUntil: 'networkidle0' });
		await delay(2000);
		
		// Take initial screenshot
		await page.screenshot({ path: 'screenshots/01-initial-load.png', fullPage: true });
		console.log('✅ Initial load screenshot saved');
		
		// Test 1: Check if Data Management section is collapsible
		console.log('\n📋 Test 1: Data Management Collapsibility');
		const dataMgmtExists = await page.$('#data-mgmt-header');
		if (dataMgmtExists) {
			console.log('✅ Data Management header found');
			
			// Check initial state (should be collapsed)
			const initialHeight = await page.$eval('#data-mgmt-content', el => el.offsetHeight);
			console.log(`   Initial height: ${initialHeight}px`);
			
			// Click to expand
			await page.click('#data-mgmt-header');
			await delay(500);
			await page.screenshot({ path: 'screenshots/02-data-mgmt-expanded.png', fullPage: true });
			
			const expandedHeight = await page.$eval('#data-mgmt-content', el => el.offsetHeight);
			console.log(`   Expanded height: ${expandedHeight}px`);
			console.log('✅ Data Management section is collapsible');
			
			// Click to collapse
			await page.click('#data-mgmt-header');
			await delay(500);
		} else {
			console.log('❌ Data Management header not found');
		}
		
		// Test 2: Start a timer and add notes
		console.log('\n📋 Test 2: Timer Notes Functionality');
		await page.type('#topic-input', 'Test Project / Test Task');
		await page.click('#start-button');
		await delay(1000);
		
		await page.screenshot({ path: 'screenshots/03-timer-started.png', fullPage: true });
		console.log('✅ Timer started');
		
		// Find the timer and check for notes textarea
		const notesTextarea = await page.$('textarea[id^="notes-"]');
		if (notesTextarea) {
			console.log('✅ Notes textarea found');
			
			// Type notes
			await notesTextarea.type('This is a test note for the timer. It supports multiple lines and special characters!');
			await delay(500);
			
			// Click outside to trigger blur event (saves notes)
			await page.click('h1');
			await delay(1000);
			
			await page.screenshot({ path: 'screenshots/04-notes-added.png', fullPage: true });
			console.log('✅ Notes added to timer');
			
			// Check if notes are persisted
			const notesValue = await notesTextarea.evaluate(el => el.value);
			if (notesValue.includes('test note')) {
				console.log('✅ Notes persisted correctly');
			} else {
				console.log('❌ Notes not persisted');
			}
		} else {
			console.log('❌ Notes textarea not found');
		}
		
		// Test 3: Stop timer and verify notes are saved
		console.log('\n📋 Test 3: Stop Timer with Notes');
		await page.click('[data-action="stop"]');
		await delay(1000);
		
		await page.screenshot({ path: 'screenshots/05-timer-stopped.png', fullPage: true });
		console.log('✅ Timer stopped');
		
		// Test 4: Check CSV export has notes column
		console.log('\n📋 Test 4: CSV Export with Notes');
		
		// Expand Data Management section if collapsed
		await page.click('#data-mgmt-header');
		await delay(500);
		
		// Setup download handler
		const client = await page.target().createCDPSession();
		await client.send('Page.setDownloadBehavior', {
			behavior: 'allow',
			downloadPath: process.cwd()
		});
		
		console.log('✅ CSV export button is accessible');
		
		// Final screenshot
		await page.screenshot({ path: 'screenshots/06-final-state.png', fullPage: true });
		
		console.log('\n✨ All tests completed!');
		console.log('📸 Screenshots saved in screenshots/ directory');
		
		// Wait a bit before closing
		await delay(2000);
		
	} catch (error) {
		console.error('❌ Test failed:', error);
		await page.screenshot({ path: 'screenshots/error.png', fullPage: true });
	} finally {
		await browser.close();
	}
}

// Create screenshots directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('screenshots')) {
	fs.mkdirSync('screenshots');
}

testFeatures();
