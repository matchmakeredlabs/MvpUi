from selenium import webdriver
from login import run_login_tests
from describe_browse import run_browse_collection_tests
from helpers import exit

def main():
    run_tests(webdriver.Firefox())
    # run_tests(webdriver.Chrome())
    
    # Uncomment for Mac users
    # runTests(webdriver.Safari())
    
def run_tests(driver):
    run_login_tests(driver)
    run_browse_collection_tests(driver)
    # TODO: Add new tests for each part of UI interaction.
    exit(driver)
    
    
if __name__ == '__main__':
    main()