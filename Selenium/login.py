from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from user_constants import baseUrl
from user_constants import username
from user_constants import password

def run_login_tests(driver):
    driver.get(baseUrl)
    
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "username"))
    )
    input_element = driver.find_element(By.ID, "username")
    input_element.clear()
    input_element.send_keys(username)

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "password"))
    )
    input_element = driver.find_element(By.ID, "password")
    input_element.clear()
    input_element.send_keys(password + Keys.ENTER)