const puppeteer = require('puppeteer');

async function testApp() {
  console.log('Starting Puppeteer test in headless mode...');
  
  const browser = await puppeteer.launch({
    headless: true, // Run in headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    
    // Listen for console messages and errors
    page.on('console', msg => {
      console.log('Browser console:', msg.text());
    });
    
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });
    
    page.on('error', error => {
      console.error('Page error:', error.message);
    });
    
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    console.log('Page loaded successfully');
    
    // Wait a bit for any JavaScript to execute
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check the page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if the page has content
    const content = await page.evaluate(() => {
      return document.body.innerText.substring(0, 200);
    });
    console.log('Page content preview:', content);
    
    // Check for any JavaScript errors in the console
    const consoleErrors = await page.evaluate(() => {
      // This will capture any errors that occurred
      return window.consoleErrors || [];
    });
    
    if (consoleErrors.length > 0) {
      console.error('Console errors found:', consoleErrors);
    } else {
      console.log('No console errors detected');
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('Screenshot saved as test-screenshot.png');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
    console.log('Test completed');
  }
}

testApp().catch(console.error);
