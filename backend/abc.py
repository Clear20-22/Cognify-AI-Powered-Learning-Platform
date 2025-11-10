from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    page.goto("http://160.187.130.84:3000/flag")
    
    # Wait for the JS to run and flag to appear (adjust if needed)
    page.wait_for_timeout(3000)  # 3 seconds
    
    # Grab the entire page content
    content = page.content()
    print(content)
    
    # Optional: grab text directly from h1 or other elements
    h1_text = page.locator("h1").inner_text()
    print("H1 Text:", h1_text)

    # Optional: intercept network responses to catch the actual flag JSON
    def handle_response(response):
        if "flag" in response.url:
            print("Flag Response:", response.text())

    page.on("response", handle_response)
    
    browser.close()
