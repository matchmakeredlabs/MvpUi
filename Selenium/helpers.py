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
    
def exit(driver): 
    time.sleep(10)
    driver.quit()