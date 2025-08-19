import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from user_constants import baseUrl

def go_home(driver):
    driver.get(baseUrl + "/c/index")
    
def click_home_button(driver, text):
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "mm-home"))
    )
    
    shadow_host = driver.find_element(By.CSS_SELECTOR, "mm-home")
    shadow_root = shadow_host.shadow_root
    shadow_content = shadow_root.find_element(By.PARTIAL_LINK_TEXT, text)
    shadow_content.click()
    

def wait_in_shadow(driver, chain, timeout=30):
    """
    Walks a sequence of (By, selector, go_into_shadow) steps.
    Returns the final WebElement once it's displayed & enabled.
    Re-finds on each poll to avoid stale element references.
    """
    def _resolve(drv):
        root = drv
        el = None
        for by, sel, go_shadow in chain:
            el = root.find_element(by, sel)
            root = el.shadow_root if go_shadow else el
            
        # only succeed when the final element is clickable-ish
        if el and el.is_displayed() and el.is_enabled():
            # also guard against disabled attribute (common on loading buttons)
            disabled = el.get_attribute("disabled")
            if not disabled:
                return el
        return False  # keep waiting

    return WebDriverWait(driver, timeout).until(_resolve)
    
def exit(driver): 
    time.sleep(10)
    driver.quit()