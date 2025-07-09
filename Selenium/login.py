from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from constants import baseUrl
from constants import username
from constants import password

def runLoginTests(driver):
    driver.get(baseUrl)
    
    WebDriverWait(driver, 3).until(
        EC.presence_of_element_located((By.ID, "username"))
    )
    input_element = driver.find_element(By.ID, "username")
    input_element.clear()
    input_element.send_keys(username)

    WebDriverWait(driver, 3).until(
        EC.presence_of_element_located((By.ID, "password"))
    )
    input_element = driver.find_element(By.ID, "password")
    input_element.clear()
    input_element.send_keys(password + Keys.ENTER)