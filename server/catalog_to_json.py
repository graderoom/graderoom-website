import os
import re
import time
import sys

import requests
from bs4 import BeautifulSoup as BS
from pymongo import MongoClient
from requests.structures import CaseInsensitiveDict


class Catalogger:
    """Stores information about classes in the BCP catalog in MongoDB
    """

    def __init__(self):
        self.session = requests.Session()
        self.url_basic = "https://b.bcp.org/catalog/home/index"
        self.url_ajax = "https://b.bcp.org/catalog/home/ajax"
        self.catalog_fname = "catalog.html"
        self.desc_len_min = 50

        self.mango = len(sys.argv) > 1
        if self.mango:
            print("Mango is enabled.")
            url = os.getenv("DB_URL")
            database_name = "common"
            collection_name = "catalog"
            self.client = MongoClient(url)
            self.db = self.client[database_name][collection_name]

    def fetch_catalog(self):
        """Downloads a new catalog and returns it
        """
        # Do the first non-ajax request to steal cookies
        headers = CaseInsensitiveDict()
        headers[
            "user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.55"
        resp = self.session.get(self.url_basic, headers=headers)
        soup = BS(resp.text, 'html.parser')
        data = soup.find('form', id='vars').find_all('input')
        csrf = data[0]['value']
        cookie = resp.headers['Set-Cookie']
        cookie = cookie.split(';')[0]

        # Headers for second request
        headers = CaseInsensitiveDict()
        headers[
            "user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.55"
        headers["content-type"] = "application/x-www-form-urlencoded; charset=UTF-8"
        headers["x-requested-with"] = "XMLHttpRequest"
        headers["cookie"] = cookie
        data = "s=&form=getCatalog&csrf=" + csrf + "&page=1&chunk=200"

        # Get a new catalog from the website
        resp = requests.post(self.url_ajax, headers=headers, data=data)
        content = resp.json()['success']['html']

        # Rename existing catalog file for backup
        if os.path.exists(self.catalog_fname):
            now = time.time()
            filename = f'catalog_old_{now}.html'
            print(f'Saved catalog to {filename}')
            os.rename(self.catalog_fname, filename)

        # Save the catalog to file in case Bellarmine stops using it
        with open(self.catalog_fname, 'w', encoding='utf8') as f:
            f.write(content)
            print(f"Successfully downloaded a new {self.catalog_fname}")

        return content

    def parse(self, use_local=False):
        """Parses the catalog
        """
        if not use_local:
            content = self.fetch_catalog()
        else:
            # Attempt to use the local html file
            try:
                with open('catalog.html') as f:
                    content = f.read()
                    print(f"{'-' * 5}Using local {self.catalog_fname} file{'-' * 5}")
            except FileNotFoundError:
                print(f"Could not find {self.catalog_fname}. Downloading a new one")
                content = self.fetch_catalog()

        # Begin parse
        soup = BS(content, 'html.parser')
        classes = soup.find_all('div', class_='card')  # Contains a div for each class in the catalog

        # Iterate each catalog div
        print(f"{len(classes)} classes found")
        for class_ in classes:
            obj = {}
            # Holds a div containing other divs that have the class attributes
            data = class_.find('div', class_='box').find_all('div', recursive=False)

            # Get the title attribute for class name. More reliable than doing .text.
            inner_div = data[0].find('div', class_='h5')
            obj['class_name'] = inner_div['title'].strip()

            # Hardcode find the rest
            obj['department'] = data[1].text.strip()  # format: "Mathematics"
            obj['grade_levels'] = data[2].text.strip()  # format: "Grades: 11;12"
            obj['credits'] = float(data[3].text.strip()[9:])  # format: "Credits: 5.0"
            obj['terms'] = int(data[4].text.strip()[7:])  # format: "Terms: 2"

            # Change grade levels from a string to a list of numbers
            obj['grade_levels'] = re.findall('[0-9]+', obj['grade_levels'])
            obj['grade_levels'] = [int(i) for i in obj['grade_levels']]

            # --- Begin parsing --- #

            # List of known strings to search for
            content_strings = ["Course Content:", "Course Description:", "course contents:", "Content:", "Description:",
                               "Course Content"]

            # Setup defaults
            desc = ""
            review = ""
            uc_csu_str = ""
            prereq = ""

            # First, try getting all info using <p> tags. If any are missing, do manual parse.

            # Iterate each <p> child of the div to find the description
            # Each p can contain multiple of the desired strings
            desc_div = data[5].find('div', class_='row short none')
            for p in desc_div.findAll('p'):
                # Clean. Replace &nbsp
                p = p.text.strip().replace('\xa0', ' ')
                p_low = p.lower()
                # Case where <p> stores the prerequisites/comments
                if 'requisite' in p_low:
                    prereq = p
                # Case where <p> is a description. This does not cover all descriptions.
                elif any([cont_string in p for cont_string in content_strings]):
                    desc = p
                # Case where <p> stores the review date
                elif re.search(r"\([\w\s]*20\d\d\)", p_low):
                    review = p
                # Case where <p> is the UC/CSU string
                elif 'uc/csu' in p_low:
                    uc_csu_str = p
                # Attempt to capture loose description using length
                elif len(p) > self.desc_len_min and desc == "":
                    desc = p

            # Give up on parsing the description using p tags because it's fucked
            # Add spaces between p tags to fix. Ex. Jazz Ensemble
            desc = " ".join([p.text for p in desc_div.findAll('p')])
            # Begin manual parse
            # Trim the start of the description
            # Handle classes that use "Course Description:" Ex. Psych AP
            # Handle classes that use "course contents:"    Ex. Intro to Video Production
            # Handle classes that use "Content:"            Ex. Pre-Calculus Honors
            # Handle classes that use "Description:"        Ex. Apocalypse Lit
            # Handle classes that use "Course Content"      Ex. Latin 4
            # Handle using "Teacher: Staff". This should be done last. Ex. Holocaust Lit
            # Otherwise, keep the description unchanged     Ex. Astronomy: Sky and Solar System
            for cont_string in content_strings:
                desc_split = desc.split(cont_string)
                # Some classes have multiple "Course Content:" strings, even though the text before
                # "read more" is excluded. Example is Acting 1. Use idx=-1 to fix.
                if len(desc_split) >= 2:
                    desc = desc_split[-1].strip()
                    break
            else:
                # Case where no string was found
                desc_split = desc.split('Teacher: Staff')
                if len(desc_split) >= 2:
                    desc = desc_split[-1].strip()

            # Remove all new lines to make the absurdity of existence easier
            desc = desc.replace('\n', ' ')
            # Remove multiple spaces to reduce the awareness of the human condition
            desc = " ".join(desc.split())

            # Trim the end of the description. Get other stuff if possible
            # Regex for "(Reviewed November 2019)" or "(Revised March 2020)" or "(Reviewed Jan 2020)"
            # in the description. Example is Shakespeare 1
            review_re = re.search(r"\([\w\s]*20\d\d\)", desc)
            if review_re is not None:
                # Set review_str if it does not exist
                review = review_re.group()
                # Set uc/csu string if it does not exist
                if uc_csu_str == '':
                    uc_csu_str = desc[review_re.end():].strip()
                # Cut the end off of the description
                desc = desc[:review_re.start()].strip()

            # Clean review to just Month and Year
            review = review.replace("Reviewed", "")
            review = review.replace("Revised", "")
            review = review.replace("(", "")
            review = review.replace(")", "")
            review = review.replace("reviewed", "")  # Astronomy: Sky and Solar System
            review = review.replace("updated", "")  # Chemistry Honors
            review = review.replace("revised", "")  # Data Science
            review = review.strip()

            # Get the uc/csu string for specific cases Ex. Animation 2
            if uc_csu_str == "":
                uc_re = re.search(r"\(UC approved.*\)", desc)
                if uc_re is not None:
                    uc_csu_str = uc_re.group()
                    uc_csu_str = uc_csu_str.replace("(", "")
                    uc_csu_str = uc_csu_str.replace(")", "")

            # Format uc/csu string
            uc_csu_str = uc_csu_str.replace("*", "")

            # Clean prereq by removing the start string
            prereq_comm_split = prereq.split("omments:")
            if len(prereq_comm_split) >= 2:
                # Use -1 index to fix AP Studio Art: Drawing
                prereq = prereq_comm_split[-1].strip()
            elif len(prereq.split("rerequisites:")) >= 2:
                # Another case, Ex. Algebra 2 Honors, just has "prerequisites:"
                prereq_comm_split = prereq.split("rerequisites:")
                prereq = prereq_comm_split[-1].strip()
            elif len(prereq.split("rerequisite:")) >= 2:
                # Another case, Ex. Data Science, has "prerequisite:"
                prereq_comm_split = prereq.split("rerequisite:")
                prereq = prereq_comm_split[-1].strip()

            # Weird case for prereq Ex. Chamber Orchestra
            prereq_idx = prereq.find("Prerequisites")
            if prereq_idx != -1:
                rev_date_re = re.search(r"\([\w\s]*20\d\d\)", prereq)
                if rev_date_re is not None:
                    rev_date_idx = rev_date_re.start()
                    prereq = prereq[prereq_idx:rev_date_idx].strip()

            # Remove Teacher: Staff from string, Ex. Symphonic Band
            prereq = prereq.replace("Teacher: Staff", "").strip()

            # Set defaults
            obj['uc_csuClassType'] = 'none'
            obj['classType'] = 'none'
            obj['school'] = 'bellarmine'

            # Set parsed information
            obj['description'] = desc
            obj['prereq'] = prereq
            obj['review'] = review

            # set classTypes
            honors_exceptions = ["Adv Comp Sci: Data Structures"]
            if 'AP' in obj['class_name']:
                obj['classType'] = 'ap'
            elif any(obj['class_name'] == x for x in honors_exceptions) or 'honors' in obj['class_name'].lower():
                obj['classType'] = 'honors'
            elif obj['department'] == 'Fitness and Health' or obj['class_name'] == "Teaching Assistant":
                obj['classType'] = 'non-academic'

            # set uc/csu classTypes
            if uc_csu_str == "":
                pass
            elif uc_csu_str.startswith("not"):
                obj['uc_csuClassType'] = "not_uc"
            elif "regular-level" in uc_csu_str.lower():
                obj['uc_csuClassType'] = "uc"
            elif obj['classType'] == 'honors':
                # The previous case takes care of all the non-honors honors
                obj['uc_csuClassType'] = "uc_hon"
            elif "honors" in uc_csu_str.lower():
                obj['uc_csuClassType'] = "uc_hon"
            elif obj['classType'] == "ap":
                # The previous case takes care of all the honors aps
                obj['uc_csuClassType'] = "uc_ap"
            elif "pending" in uc_csu_str.lower():
                obj['uc_csuClassType'] = 'none'
            else:
                obj['uc_csuClassType'] = "uc"

            '''
            if 1: #not any([review_str == "", uc_csu_str == "", prereq_comm_str == ""]):
                print(f"course: {obj['class_name']}")
                print(f"desc  : {desc}")
                print(f"desc  : {desc[:50]}...{desc[-50:]}")
                print(f"review: {review_str}")
                print(f"uc/csu: {uc_csu_str}")
                print(f"uc/csu: {obj['uc_csuClassType']}")
                print(f"type  : {obj['classType']}")
                print(f"prereq: {prereq_comm_str}")
                print("_"*100)
            '''

            # Update existing classes, otherwise create new ones
            if self.mango:
                self.db.update_one({'class_name': obj['class_name']}, {'$set': obj}, True)

        if self.mango:
            self.client.close()


if __name__ == '__main__':

    catalogger = Catalogger()
    catalogger.parse()
