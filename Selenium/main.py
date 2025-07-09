from selenium import webdriver
from login import runLoginTests
from exit import exit

def main():
    runTests(webdriver.Firefox())
    runTests(webdriver.Chrome())
    
    # Uncomment for Mac users
    # runTests(webdriver.Safari())
    
def runTests(driver):
    runLoginTests(driver)
    # TODO: Add new tests for each part of UI interaction.
    exit(driver)
    
    
if __name__ == '__main__':
    main()