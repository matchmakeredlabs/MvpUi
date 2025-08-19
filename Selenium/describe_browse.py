from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from helpers import click_home_button
from helpers import wait_in_shadow

def run_browse_collection_tests(driver):
    click_home_button(driver, "Browse & Describe")
    filter(driver, "Math", "Mathematics", "Math Help", "mathhelp")
    click_collection(driver, "Math Help's Bozonic Resources 2")
    export(driver)

def filter(driver, keyword=None, subject=None, publisher=None, organization=None):
    """
    Apply keyword, subject, and/or publisher filters in mm-filter-table.
    Any arg set to None is skipped.
    """
    WebDriverWait(driver, 50)
    
    # Grab filters-container shadow root
    coll_root   = driver.find_element(By.CSS_SELECTOR, "mm-collections").shadow_root
    filter_root = coll_root.find_element(By.CSS_SELECTOR, "mm-filter-table").shadow_root
    filters_container = filter_root.find_element(By.CSS_SELECTOR, ".filter-table-header .filters-container")

    # Filter by keyword
    if keyword is not None:
        kw = filters_container.find_element(By.ID, "keywordElement")
        kw.clear()
        kw.send_keys(keyword)
        filters_container.find_element(By.ID, "addKeyword").click()
    
    WebDriverWait(driver, 50)
    
    # Filter by dropdowns
    filter_dropdowns = filters_container.find_element(By.ID, "filterDropdowns")

    # Subject
    if subject is not None:
        subj_sel = filter_dropdowns.find_element(By.ID, "subject-dropdown")
        
        # Wait until at least 1 dropdown element is visible
        WebDriverWait(driver, 50).until(lambda d: len(subj_sel.find_elements(By.TAG_NAME, "option")) > 1)
        
        opt = subj_sel.find_element(By.XPATH, f'.//option[normalize-space(.)="{subject}"]')
        opt.click()
    
    if publisher is not None:
        pub_sel = filter_dropdowns.find_element(By.ID, "publisher-dropdown")
        
        # Wait until at least 1 dropdown element is visible
        WebDriverWait(driver, 50).until(lambda d: len(pub_sel.find_elements(By.TAG_NAME, "option")) > 1)
        
        opt = pub_sel.find_element(By.XPATH, f'.//option[normalize-space(.)="{publisher}"]')
        opt.click()
        
    WebDriverWait(driver, 50)
        
    if organization is not None:
        org_sel = filter_dropdowns.find_element(By.ID, "_orgId-dropdown")
        
        # Wait until at least 1 dropdown element is visible
        WebDriverWait(driver, 50).until(lambda d: len(org_sel.find_elements(By.TAG_NAME, "option")) > 1)
        
        opt = org_sel.find_element(By.XPATH, f'.//option[normalize-space(.)="{organization}"]')
        opt.click()

def click_collection(driver, name):
    # 1) Wait until at least one row has rendered under #table-body
    WebDriverWait(driver, 10).until(lambda d: d.execute_script("""
      const coll = document.querySelector('mm-collections');
      if (!coll || !coll.shadowRoot) return false;
      const ft  = coll.shadowRoot.querySelector('mm-filter-table');
      if (!ft || !ft.shadowRoot) return false;
      const tbl = ft.shadowRoot.querySelector('mm-table');
      if (!tbl || !tbl.shadowRoot) return false;
      return tbl.shadowRoot.querySelector('#table-body tr') !== null;
    """))

    # 2) Run one JS snippet to find the <a> by its exact text, scroll it into view and click it
    driver.execute_script("""
      const name = arguments[0];
      const collHost = document.querySelector('mm-collections').shadowRoot;
      const ftHost   = collHost.querySelector('mm-filter-table').shadowRoot;
      const tblHost  = ftHost.querySelector('mm-table').shadowRoot;
      const rows     = tblHost.querySelectorAll('#table-body tr');
      
      for (const row of rows) {
        const link = row.querySelector('a');
        if (link && link.textContent.trim() === name) {
          link.scrollIntoView({block: 'center'});
          link.click();
        }
      }
    """, name)
    
def export(driver):
  WebDriverWait(driver, 50).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "mm-view-collection"))
    )
  
  view_root = driver.find_element(By.CSS_SELECTOR, "mm-view-collection").shadow_root
  columns = view_root.find_element(By.CLASS_NAME, "mm_columns")
  container = columns.find_element(By.ID, "descriptor-container")
  export_buttons = container.find_element(By.CLASS_NAME, "export-buttons")
  
  shadow_chain = [
    (By.CSS_SELECTOR, "mm-view-collection", True),
    (By.CLASS_NAME, "mm_columns", False),
    (By.ID, "mmx_browse_tree", False),
    (By.CSS_SELECTOR, "mm-collection", True)
  ]
  wait_in_shadow(driver, shadow_chain, timeout=50) # Wait until collection is fully loaded before clicking export matches button
  
  export_matches = export_buttons.find_element(By.ID, "match-collections-button")
  export_matches.click()
  
  export_collection = export_buttons.find_element(By.CSS_SELECTOR, ".export-button.collection")
  export_collection.click()
  
  export_modal = view_root.find_element(By.CSS_SELECTOR, "mm-modal")
  button_container = export_modal.find_element(By.CLASS_NAME, "button-container-download")
  
  json_button = button_container.find_element(By.XPATH, "/mm-modal/div/div[1]") # Export JSON
  json_button.click()
  
  csv_button = button_container.find_element(By.XPATH, "/mm-modal/div/div[2]") # Export CSV
  csv_button.click()