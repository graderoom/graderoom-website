import json
import requests
import sys
from bs4 import BeautifulSoup as bS
from datetime import datetime

ndsj_url = "ps.ndsj.org"
bcp_url = "powerschool.bcp.org"


def json_format(success: bool, message_or_grades: str or dict, weights: dict or None = None) -> str:
    """
    Args:
        weights: weight data in JSON format
        success: boolean if scraping was successful
        message_or_grades: a message for errors or grade data in JSON format

    Returns:
        A JSON formatted response
    """

    if weights is not None and success:
        return json.dumps({'success': True, 'new_grades': message_or_grades, 'new_weights': weights})
    if success:
        return json.dumps({'success': True, 'new_grades': message_or_grades})

    return json.dumps({'success': False, 'message': message_or_grades})


def status(progress: float, message: str) -> str:
    return json.dumps({'progress': progress, 'message': message})


def clean_string(s: str) -> bool or float:
    """Cleans the string"""
    s = s.strip()
    if s == "":
        return False
    return s


def clean_number(n: str) -> bool or float:
    """Cleans the number"""
    n = n.strip()
    try:
        n = float(n)
        return n
    except ValueError:
        return False


class PowerSchoolClassGrade:
    """Contains information and assignments for a PowerSchool class

    One ClassGrade object is needed for every PowerSchool class scraped
    from the site. It contains all the information necessary to
    redisplay a user's grade for a PowerSchool class, such as names,
    overall grades, and assignments. Each assignment also has necessary
    attributes.

    Attributes:
        class_name: string
        teacher_name: string
        overall_percent: float
        overall_letter: string
        student_id: string
        section_id: string
        ps_locked: boolean
        grades: list of dictionaries of individual assignments
    """

    def __init__(self, class_name: str, teacher_name: str or bool, overall_percent: float, overall_letter: str,
                 student_id: str or bool, section_id: str or bool, ps_locked: bool) -> None:
        """Inits ClassGrade with PowerSchool class information"""
        self.class_name = class_name
        self.teacher_name = teacher_name
        self.overall_percent = overall_percent
        self.overall_letter = overall_letter
        self.student_id = student_id
        self.section_id = section_id
        self.ps_locked = ps_locked
        self.grades: list = []

    def as_dict(self) -> dict:
        """Returns ClassGrade object as a formatted dictionary"""
        return {
            'class_name': self.class_name,
            'teacher_name': self.teacher_name,
            'overall_percent': self.overall_percent,
            'overall_letter': self.overall_letter,
            'student_id': self.student_id,
            'section_id': self.section_id,
            'ps_locked': self.ps_locked,
            'grades': self.grades
        }


def parse_ps_class(local_class: PowerSchoolClassGrade, raw_data: requests.Response) -> dict:
    # Function that takes a Powerschool assignment object and returns
    # a Graderoom assignment object
    def stripper(info: dict) -> dict or None:
        if "_assignmentsections" not in info:
            return
        psaid = info["assignmentid"]  # PowerSchool Assignment ID
        _data = info["_assignmentsections"][0]
        date = _data["duedate"].replace("-", "/")
        date = date[5:] + "/" + date[:4]
        sort_date = datetime.strptime(date, "%m/%d/%Y").timestamp()
        category = _data["_assignmentcategoryassociations"][0]["_teachercategory"]["name"]
        assignment_name = _data["name"]
        exclude = not _data["iscountedinfinalgrade"]
        if "totalpointvalue" in _data and isinstance(_data["totalpointvalue"], (float, int)):
            points_possible = _data["totalpointvalue"]
        else:
            points_possible = False
        if len(_data["_assignmentscores"]) > 0:
            exclude = exclude or _data["_assignmentscores"][0]["isexempt"]
            sort_date = _data["_assignmentscores"][0]["scoreentrydate"]
            sort_date = datetime.strptime(sort_date, "%Y-%m-%d %H:%M:%S").timestamp()
            if "scorepoints" in _data["_assignmentscores"][0]:
                points_gotten = _data["_assignmentscores"][0]["scorepoints"]
                if "weight" in _data:
                    points_gotten = points_gotten * _data["weight"]
            else:
                points_gotten = False
            if "scorepercent" in _data["_assignmentscores"][0]:
                grade_percent = round(_data["_assignmentscores"][0]["scorepercent"], 2)
            else:
                grade_percent = False
        else:
            points_gotten = False
            grade_percent = False
        return {
            "date": date,
            "sort_date": sort_date,
            "category": category,
            "assignment_name": assignment_name,
            "exclude": exclude,
            "points_possible": points_possible,
            "points_gotten": points_gotten,
            "grade_percent": grade_percent,
            "psaid": psaid
        }

    # function that removes nonexistence objects
    def remove_empty(value: dict or None) -> bool:
        if value is None:
            return False
        return True

    # input
    raw = json.loads(raw_data.text)

    # output
    local_class.grades = sorted(list(filter(remove_empty, map(stripper, raw))), key=lambda j: j['sort_date'],
                                reverse=True)
    local_class.grades = [{key: value for key, value in assignment.items() if key != 'sort_date'} for assignment in
                          local_class.grades]  # Remove sorting date
    local_class.grades = sorted(local_class.grades, key=lambda j: j['date'])

    return local_class.as_dict()


class Scraper:
    def __init__(self):
        """Inits with a session"""
        self.session = requests.Session()
        self._progress = 0
        self._message = ""
        print(status(self._progress, self._message))

    @property
    def progress(self):
        return self._progress

    @property
    def message(self):
        return self._message

    @progress.setter
    def progress(self, value: float):
        self._progress = value
        print(status(self._progress, self._message))

    @message.setter
    def message(self, value: str):
        self._message = value
        print(status(self._progress, self._message))


class PowerschoolScraper(Scraper):
    def __init__(self, _school: str) -> None:
        super().__init__()
        self.school = _school
        if _school == "ndsj":
            self.base_url = ndsj_url
        elif _school == "bellarmine":
            self.base_url = bcp_url

    def __login_bcp(self, email: str, _password: str) -> None:
        """Logs into PowerSchool with credentials

        Session is stored in instance variable.
        Authenticates via SAML
        See https://developers.onelogin.com/saml
        """
        # Various headers required for logging in
        headers_1 = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,'
                      'application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Host': 'federation.bcp.org',
            'Origin': 'https://federation.bcp.org',
            'Referer': 'https://federation.bcp.org/idp/SSO.saml2',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/76.0.3809.132 Safari/537.36 '
        }

        headers_2 = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,'
                      'application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Host': 'federation.bcp.org',
            'Origin': 'https://powerschool.bcp.org',
            'Referer': 'https://powerschool.bcp.org/guardian/home.html',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/76.0.3809.132 Safari/537.36 '
        }

        headers_3 = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,'
                      'application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'federation.bcp.org',
            'Origin': 'https://federation.bcp.org',
            'Referer': 'https://federation.bcp.org/idp/SSO.saml2',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/76.0.3809.132 Safari/537.36 '
        }

        headers_4 = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,'
                      'application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'powerschool.bcp.org',
            'Origin': 'https://federation.bcp.org',
            # Below will be changed to the dynamic URL
            'Referer': 'CHANGE_THIS',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/76.0.3809.132 Safari/537.36 '
        }

        # First request
        self.message = "Logging in"
        url = "https://powerschool.bcp.org/guardian/home.html"
        resp = self.session.get(url, headers=headers_1, timeout=10)
        soup = bS(resp.text, "html.parser")
        samlr = soup.find("input", {'name': 'SAMLRequest'}).get('value')
        self.progress = 5

        # Second request
        self.message = "Logging in."
        url = "https://federation.bcp.org/idp/SSO.saml2"
        data = {
            'RelayState': "/guardian/home.html",
            'SAMLRequest': samlr,
        }
        resp = self.session.post(url, data=data, headers=headers_2, timeout=10)
        soup = bS(resp.text, "html.parser")
        dynamic_url = soup.find("form", id='ping-login-form').get('action')
        self.progress = 10

        # Third request
        self.message = "Logging in.."
        dynamic_url = "https://federation.bcp.org" + dynamic_url
        data = {
            'pf.ok': '',
            'pf.cancel': '',
            'pf.username': email,
            'pf.pass': _password,
        }
        resp = self.session.post(dynamic_url, data=data, headers=headers_3,
                                 timeout=10)
        soup = bS(resp.text, "html.parser")
        self.progress = 15

        # check error msg
        error = soup.find("div", class_='grid-alert error')
        if error is not None and "Your account is disabled. Please contact your system administrator." in error.text:
            self.progress = 0
            print(json_format(False, 'Your account is no longer active.'))
            sys.exit()

        # If no response, authentication failed (incorrect login)
        samlr = soup.find("input", {'name': 'SAMLResponse'})
        if samlr is None:
            self.progress = 0
            print(json_format(False, "Incorrect login details."))
            sys.exit()

        # Fourth request
        self.message = "Logging in..."
        url = 'https://powerschool.bcp.org:443/saml/SSO/alias/pslive'
        samlr = samlr.get('value')
        headers_4['Referer'] = dynamic_url
        data = {
            'SAMLResponse': samlr,
            # Below does not affect where the site redirects
            'RelayState': "/guardian/home.html",
        }
        # Manually add cookie
        jsession = self.session.cookies.get_dict()['JSESSIONID']
        headers_4['Cookie'] = "JSESSIONID=" + jsession
        self.session.post(url, data=data, headers=headers_4, timeout=10)
        self.progress = 20

    def __login_ndsj(self, email: str, _password: str) -> None:
        """Logs into PowerSchool with credentials

        Session is stored in instance variable.
        Authenticates via SAML
        See https://developers.onelogin.com/saml
        """
        # Various headers required for logging in
        headers_1 = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,'
                      '*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Host': 'ps.ndsj.org',
            'Origin': 'https://ps.ndsj.org',
            'Referer': 'https://ps.ndsj.org/public/home.html',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/76.0.3809.132 Safari/537.36 '
        }

        # First request
        self.message = "Logging in"
        url = "https://ps.ndsj.org/guardian/home.html"
        data = {
            'dbpw': _password,
            'credentialType': 'User Id and Password Credential',
            'account': email[:-9] if email.endswith("@ndsj.org") else email, # Remove @ndsj.org
            'pw': _password,
            'serviceName': 'PS Parent Portal',
            'pcasServerUrl': '/',
            'request_locale': 'en_US',
        }
        resp = self.session.post(url, data=data, headers=headers_1, timeout=10)
        soup = bS(resp.text, 'html.parser')

        error = soup.find("div", class_="feedback-alert")
        if error is not None and error.text == "Invalid Username or Password!":
            self.progress = 0
            print(json_format(False, "Incorrect login details."))
            sys.exit()

        self.progress = 20

    def login(self, email: str, _password: str) -> bool:
        """
        :returns False if grades are locked, True if grades are visible
        """
        if self.school == "ndsj":
            self.__login_ndsj(email, _password)
        elif school == "bellarmine":
            self.__login_bcp(email, _password)
        else:
            return False

        # If we get to this point the session is logged in
        # Check if PowerSchool is locked
        url = 'https://' + self.base_url + '/guardian/home.html'
        resp = self.session.get(url, timeout=10)
        soup_resp = bS(resp.text, "html.parser")
        table = soup_resp.find("table")
        self.progress = 25

        if table is not None:
            self.message = "Logged in!"
            self.message = "Checking if PowerSchool is locked..."
            self.progress = 30
            rows = list(filter(lambda l: len(l) > 0, list(map(lambda row: list(
                filter(lambda link: link['href'][:5] == 'score' and link['href'][link['href'].index('&fg') + 4] == 'S',
                       row.find_all("a"))), table.find_all("tr", class_='center')))))
            if len(rows) == 0:
                self.message = "PowerSchool is locked."
                if (len(list(filter(lambda d: "student_id" in d and "section_id" in d, data_if_locked))) == len(
                        data_if_locked)
                        and "term" in term_data_if_locked and "semester" in term_data_if_locked):
                    # Scrape locked powerschool with given data
                    self.message = "Getting data from locked PowerSchool..."
                    return False
                else:
                    self.progress = 0
                    print(json_format(False, 'PowerSchool is locked.'))
                    sys.exit()
        else:
            self.progress = 0
            print(json_format(False, 'Your account is no longer active.'))
            sys.exit()

        return True

    def get_history(self):
        """Uses a session to grab all available grade data on powerschool"""
        url = 'https://' + self.base_url + '/guardian/termgrades.html'
        resp = self.session.get(url, timeout=10)
        self.progress = 35
        self.message = 'Searching for courses...'
        soup_resp = bS(resp.text, "html.parser")

        # Begin organizing response data
        all_history = {}

        # Locate links of past years
        year_list = soup_resp.find("ul", class_='tabs')
        year_links = year_list.find_all("li")

        total_term_count = len(year_links)
        scraped_term_count = 0
        initial_progress = self.progress
        max_progress = 100
        self.message = 'Synced ' + str(scraped_term_count) + ' of ' + str(total_term_count) + ' terms...'
        self.progress = initial_progress + (max_progress - initial_progress) * scraped_term_count / (
            1 if total_term_count == 0 else total_term_count)
        for year_link in year_links:
            # Exclude summer school pages by checking for SS in title
            # since they show duplicate data
            link = year_link.find("a")
            if "SS" in str(link):
                total_term_count -= 1
                self.message = 'Synced ' + str(scraped_term_count) + ' of ' + str(total_term_count) + ' terms...'
                self.progress = initial_progress + (max_progress - initial_progress) * scraped_term_count / (
                    1 if total_term_count == 0 else total_term_count)
                continue

            # Cut the year from the link text
            year = year_link.text.strip()[:5]

            # Ensure it exists, then fetch the year link
            if not link['href']:
                total_term_count -= 1
                self.message = 'Synced ' + str(scraped_term_count) + ' of ' + str(total_term_count) + ' terms...'
                self.progress = initial_progress + (max_progress - initial_progress) * scraped_term_count / (
                    1 if total_term_count == 0 else total_term_count)
                continue
            url = 'https://' + self.base_url + '/guardian/'
            resp = self.session.get(url + link['href'], timeout=10)
            soup_resp = bS(resp.text, "html.parser")

            # Begin parsing data
            main_table = soup_resp.find("table")
            main_table_rows = main_table.find_all("tr")

            title = ""
            semester_classes = []
            year_data = {}
            for row in main_table_rows:
                # Identify what semester we are under
                th = row.find("th")
                if th is not None and th.text in ["S0", "S1", "S2"]:
                    if semester_classes:
                        # Add data when all classes for a semester
                        # have been scraped
                        year_data["S3" if title == "S0" else title] = semester_classes
                    # Reset for a new semester
                    title = th.text
                    semester_classes = []

                # Check if the current row has class data
                if title != "" and row.find("td", align="left"):
                    data = row.find_all("td")

                    class_name = clean_string(data[0].text)
                    overall_letter = clean_string(data[1].text)
                    overall_percent = clean_number(data[2].text)

                    # Scrape links that lead to assignments
                    if row.find("a"):
                        url = "https://" + self.base_url + "/guardian/"
                        url = url + row.find("a").get('href')
                        self.scrape_class(url, semester_classes,
                                          overall_percent,
                                          overall_letter)
                    else:
                        local_class = PowerSchoolClassGrade(class_name, False, overall_percent, overall_letter, False,
                                                            False, False)
                        semester_classes.append(local_class.as_dict())

            # Finalize data for the selected year
            if title != "":
                year_data["S3" if title == "S0" else title] = semester_classes
                all_history[year] = year_data
                scraped_term_count += 1
            else:
                total_term_count -= 1

            self.message = 'Synced ' + str(scraped_term_count) + ' of ' + str(total_term_count) + ' terms...'
            self.progress = initial_progress + (max_progress - initial_progress) * scraped_term_count / (
                1 if total_term_count == 0 else total_term_count)

        if all_history == {}:
            print(json_format(False, "No class data."))
        else:
            print(json_format(True, all_history))

    def get_present(self):
        """Uses a session to grab current semester grade data"""
        url = 'https://' + self.base_url + '/guardian/home.html'
        resp = self.session.get(url, timeout=10)
        self.progress = 35
        self.message = 'Searching for courses...'
        soup_resp = bS(resp.text, "html.parser")

        # Begin organizing response data
        all_classes = []

        # Main table on PowerSchool Home Page
        main_table = soup_resp.find("table", class_='linkDescList grid')

        # Extract only the rows of a class from the table
        main_table_rows = main_table.find_all("tr")
        class_rows = []
        for row in main_table_rows:
            if row.has_attr('class') and row['class'] == ['center']:
                class_rows.append(row)

        total_course_count = len(class_rows)
        scraped_course_count = 0
        initial_progress = self.progress
        max_progress = 90
        self.message = 'Synced ' + str(scraped_course_count) + ' of ' + str(total_course_count) + ' courses...'
        self.progress = initial_progress + (max_progress - initial_progress) * scraped_course_count / (
            1 if total_course_count == 0 else total_course_count)

        # Iterate over each row and fetch data for that class
        for class_row in class_rows:
            assignments_link = None
            overall_percent = None
            overall_letter = None

            # Get overall grade and the link to assignments page
            links = class_row.find_all("a")
            for link in links:
                # If an overall grade is present, the link text is bold
                # If no grade is present, then it is [ i ]
                # Finally, check if it is actually a class grade link
                # by checking the first five letters for "score"
                if ((link.has_attr('class') and link['class'] == ['bold']) or link.text == '[ i ]') \
                        and link['href'][:5] == 'score':

                    # make sure it's not a quarter
                    semester = str(link['href']).split('&fg=')[1][:2]
                    if semester.startswith("Q"):
                        continue

                    assignments_link = link['href']

                    # Split combined letter grade and percent text
                    # into two separate values
                    letter_and_percent = link.text
                    if letter_and_percent == '[ i ]':
                        overall_letter = False
                        overall_percent = False
                    else:
                        for i, charac in enumerate(letter_and_percent):
                            if str.isdigit(charac):
                                overall_letter = letter_and_percent[:i]
                                overall_percent = float(letter_and_percent[i:])
                                break

            # Ensure link for assignments exists
            if assignments_link is None:
                total_course_count -= 1
                self.message = 'Synced ' + str(scraped_course_count) + ' of ' + str(total_course_count) + ' courses...'
                self.progress = initial_progress + (max_progress - initial_progress) * scraped_course_count / (
                    1 if total_course_count == 0 else total_course_count)
                continue

            url = 'https://' + self.base_url + '/guardian/'
            url = url + assignments_link
            if (self.scrape_class(url, all_classes, overall_percent,
                                  overall_letter)):
                scraped_course_count += 1
            else:
                total_course_count -= 1

            self.message = 'Synced ' + str(scraped_course_count) + ' of ' + str(total_course_count) + ' courses...'
            self.progress = initial_progress + (max_progress - initial_progress) * scraped_course_count / (
                1 if total_course_count == 0 else total_course_count)

        # Fetch the current term and semester
        url = 'https://' + self.base_url + '/guardian/myschedulematrix.html'
        resp = self.session.get(url, timeout=10)
        soup_resp = bS(resp.text, "html.parser")
        self.progress = 95
        self.message = 'Fetching term and semester data...'

        main_table = soup_resp.find("table")
        table_cells = main_table.find_all("td")
        term = table_cells[0].text
        semester = table_cells[1].text
        if term.startswith("SS"):
            semester = "S0"
            start_year = int(term[4:]) - 1
            end_year = start_year + 1
            term = str(start_year) + "-" + str(end_year)
        semester = "S3" if semester == "S0" else semester

        if term is None or semester is None:
            raise Exception("Error getting term and semester data")

        # Print out the result
        if not all_classes:
            self.progress = 0
            self.message = 'No class data.'
            print(json_format(False, "No class data."))
        else:
            # Add term and semester to the data
            self.progress = 100
            self.message = 'Sync Complete!'
            all_classes = {term: {semester: all_classes}}
            print(json_format(True, all_classes))

    def scrape_class(self, url: str, all_classes: list, overall_percent: float or bool, overall_letter: str):
        """Scrapes data from a class assignments page
        Args:
            url: String of the page to scrape
            all_classes: List that assignments will be added to
            overall_percent: Float
            overall_letter: Float
        """
        grades_resp = self.session.get(url, timeout=10)
        grades_soup = bS(grades_resp.text, 'html.parser')

        # The two tables in the page. info is top, grades is bottom
        class_tables = grades_soup.find_all('table')
        info_table = class_tables[0]

        # Get teacher and class name
        info_row = info_table.find_all('tr')[1]
        info_data = info_row.find_all('td')
        class_name = info_data[0].text
        teacher_name = info_data[1].text

        # Create a ClassGrade object to hold assignment data
        # Ensure all data is present, otherwise skip the class
        if class_name and teacher_name and overall_percent is not None and overall_letter is not None:
            local_class = PowerSchoolClassGrade(class_name, teacher_name, overall_percent, overall_letter, None, None,
                                                False)
        else:
            return False

        # Get the Section ID for a class
        wrapper = grades_soup.find('div', class_='xteContentWrapper')
        section_id = wrapper.find('div')['data-sectionid']

        # Get the Student ID for a class
        student_id = wrapper['data-ng-init'].split(';')[0].split("'")[1][3:]

        # Add student_id and section_id
        local_class.student_id = student_id
        local_class.section_id = section_id

        # Remove classes with no grades
        local_class = parse_ps_class(local_class, self.get_class(url, local_class))
        if not local_class['grades']:
            return False

        all_classes.append(local_class)
        return True

    def get_class(self, url: str, local_class: PowerSchoolClassGrade) -> requests.Response:
        headers = {
            'Connection': 'keep-alive',
            'authority': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/84.0.4147.135 Safari/537.36',
            'Content-Type': 'application/json;charset=UTF-8',
            'Origin': 'https://' + self.base_url,
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'Referer': url,
            'Accept-Language': 'en-US,en;q=0.9',
        }

        params = (('_', ''),)

        now = datetime.now()

        # Declare likely start and end dates for each semester to
        # determine data to send request with

        dates = [datetime(now.year - 4, 1, 1), datetime(now.year + 4, 1, 1)]
        [start_date, end_date] = dates

        start_date = json.dumps(start_date.strftime("%Y-%m-%d"))
        end_date = json.dumps(end_date.strftime("%Y-%m-%d"))

        data = '{"section_ids":[' + local_class.section_id + '],"student_ids":[' + local_class.student_id + \
               '],"start_date":' + start_date + ',"end_date":' + end_date + '} '

        url = 'https://' + self.base_url + '/ws/xte/assignment/lookup'
        response = self.session.post(url, headers=headers, params=params, data=data)

        return response

    def get_locked(self, class_data: dict, term_data: dict) -> None:
        # Begin organizing response data
        all_classes = []
        total_course_count = len(class_data)
        scraped_course_count = 0
        initial_progress = self.progress
        max_progress = 90
        self.message = 'Synced ' + str(scraped_course_count) + ' of ' + str(total_course_count) + ' courses...'
        self.progress = initial_progress + (max_progress - initial_progress) * scraped_course_count / (
            1 if total_course_count == 0 else total_course_count)

        for data in class_data:
            class_name = data['class_name']
            teacher_name = data['teacher_name']
            overall_percent: float or bool = data['overall_percent']
            overall_letter = data['overall_letter']
            student_id = data['student_id']
            section_id = data['section_id']
            local_class = PowerSchoolClassGrade(class_name, teacher_name, overall_percent, overall_letter, student_id,
                                                section_id, True)

            local_class = parse_ps_class(local_class, self.get_class('https://powerschool.bcp.org/', local_class))
            if len(local_class['grades']) > 0:
                all_classes.append(local_class)
                scraped_course_count += 1
                self.message = 'Synced ' + str(scraped_course_count) + ' of ' + str(total_course_count) + ' courses...'
                self.progress = initial_progress + (max_progress - initial_progress) * scraped_course_count / (
                    1 if total_course_count == 0 else total_course_count)
            else:
                total_course_count -= 1
                self.message = 'Synced ' + str(scraped_course_count) + ' of ' + str(total_course_count) + ' courses...'
                self.progress = initial_progress + (max_progress - initial_progress) * scraped_course_count / (
                    1 if total_course_count == 0 else total_course_count)

        # Add term and semester data
        self.progress = 95
        self.message = 'Fetching term and semester data...'
        term = term_data["term"]
        semester = term_data["semester"]
        if len(all_classes) > 0:
            self.progress = 100
            self.message = 'Sync Complete!'
            all_classes = {term: {semester: all_classes}}
            print(json_format(True, all_classes))
        else:
            self.progress = 0
            self.message = 'No class data.'
            print(json_format(False, "No class data."))


def clean(_soup) -> None:
    """
    Removes elements in soup with class 'visually-hidden'
    :param _soup: soup
    :return:
    """
    to_delete = _soup.find_all('span', class_='visually-hidden')
    [t.decompose() for t in to_delete]


class BasisClassGrade:
    def __init__(self, class_name: str, overall_percent: str, grades: list) -> None:
        self.class_name = class_name
        self.overall_percent = overall_percent
        self.grades = grades

    @property
    def as_dict(self) -> dict:
        return {
            "class_name": self.class_name,
            "overall_percent": self.overall_percent,
            "grades": self.grades
        }


class BasisWeights:
    def __init__(self) -> None:
        self._weights = []

    @property
    def as_list(self) -> list:
        return self._weights

    def add_class(self, class_name: str) -> None:
        if len([class_ for class_ in self._weights if class_["className"] == class_name]) == 0:
            self._weights.append({"className": class_name, "weights": {}, "hasWeights": False})

    def add_weight(self, class_name: str, weight_name: str, weight_value: float):
        self.add_class(class_name)

        exists = next((weight for weight in self._weights if weight['className'] == class_name), None)
        if exists is None:
            self._weights.append({"className": class_name, "weights": {}, "hasWeights": False})
            index = len(self._weights) - 1
        else:
            index = self._weights.index(exists)

        self._weights[index]["weights"][weight_name] = weight_value
        if weight_value is not None:
            self._weights[index]["hasWeights"] = True


class BasisScraper(Scraper):
    def login(self, email: str, _password: str) -> bool:
        url = "https://app.schoology.com/login?destination=grades/grades"

        payload = {
            'mail': email,
            'pass': _password,
            'form_id': 's_user_login_form'
        }

        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,'
                      'application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'origin': 'https://app.schoology.com',
            'referer': 'https://app.schoology.com/login?destination=grades/grades',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/94.0.4606.61 Safari/537.36 Edg/94.0.992.31',
        }

        resp = self.session.post(url, headers=headers, data=payload, allow_redirects=False)
        if len(resp.cookies) == 0:
            self.progress = 0
            print(json_format(False, "Incorrect login details."))
            sys.exit()

        self.progress = 5
        self.message = "Logged in!"
        return True

    def get_present(self):
        url = "https://app.schoology.com/grades/grades"

        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,'
                      'application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'referer': 'https://app.schoology.com/login?destination=grades/grades',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/94.0.4606.61 Safari/537.36 Edg/94.0.992.31',
        }

        resp = self.session.post(url, headers=headers)
        self.progress = 20
        self.message = 'Searching for courses...'

        soup = bS(resp.text, 'html.parser')

        classes = soup.find_all('div', class_="gradebook-course")

        all_classes = []
        weights = BasisWeights()
        term = None

        total_course_count = len(classes)
        scraped_course_count = 0
        initial_progress = self.progress
        max_progress = 100
        self.message = 'Synced ' + str(scraped_course_count) + ' of ' + str(total_course_count) + ' courses...'
        self.progress = initial_progress + (max_progress - initial_progress) * scraped_course_count / (
            1 if total_course_count == 0 else total_course_count)

        for class_ in classes:
            class_name_soup = class_.find('div', class_='gradebook-course-title')
            clean(class_name_soup)
            class_name = class_name_soup.text
            class_name = clean_string(class_name)

            weights.add_class(class_name)

            if 'lunch' in class_name.lower() or 'office' in class_name.lower():
                total_course_count -= 1
                self.message = 'Synced ' + str(scraped_course_count) + ' of ' + str(total_course_count) + ' courses...'
                self.progress = initial_progress + (max_progress - initial_progress) * scraped_course_count / (
                    1 if total_course_count == 0 else total_course_count)
                continue

            grades_soup = class_.find('div', class_='gradebook-course-grades')
            overall_grade_soup = grades_soup.find('span', class_='numeric-grade primary-grade')
            if overall_grade_soup is None:
                overall_grade = None
            else:
                overall_grade_soup = overall_grade_soup.find('span', class_='rounded-grade')
                overall_grade = overall_grade_soup['title']

            grades_soup = grades_soup.find('table', role='presentation')
            term_soup = grades_soup.find('tr', class_='period-row').find('span', class_='title')
            clean(term_soup)
            if term is None:
                term = '-'.join(list(map(lambda t: t[-2:], term_soup.text.split(' - '))))
                term = clean_string(term)

            categories_soup = grades_soup.find_all('tr', class_='category-row')
            grades = []
            for category_soup in categories_soup:
                clean(category_soup)
                category_name = category_soup.find('span', class_='title')
                if category_name is None:
                    continue

                category_name = clean_string(category_name.text)

                category_value = category_soup.find('span', class_='percentage-contrib')

                if category_value is not None:
                    category_value = clean_number(category_value.text[1:-2])
                category_id = category_soup['data-id']

                if category_name is not False:
                    weights.add_weight(class_name, category_name, category_value)
                    assignments_soup = grades_soup.find_all('tr', {'data-parent-id': category_id})
                    for assignment_soup in assignments_soup:
                        assignment_id = assignment_soup['data-id']

                        assignment_name_soup = assignment_soup.find('span', class_='title')
                        clean(assignment_name_soup)
                        assignment_name = assignment_name_soup.text

                        assignment_date_time_soup = assignment_soup.find('span', class_='due-date')
                        if assignment_date_time_soup is not None:
                            clean(assignment_date_time_soup)
                            date_time = assignment_date_time_soup.text
                            if ' ' not in date_time:
                                date_time += " 12:00am"

                            date, time = date_time.split(' ')
                            sort_date = datetime.strptime(date_time, "%m/%d/%y %I:%M%p").timestamp()
                        else:
                            date = None
                            time = None
                            sort_date = None

                        assignment_grade_soup = assignment_soup.find('td', class_='grade-column')

                        points_gotten_soup = assignment_grade_soup.find('span', class_='rounded-grade')
                        if points_gotten_soup is not None and points_gotten_soup.has_attr('title'):
                            points_gotten = clean_number(points_gotten_soup['title'])
                        else:
                            points_gotten = None

                        points_possible_soup = assignment_grade_soup.find('span', class_='max-grade')
                        if points_possible_soup is not None:
                            points_possible = clean_number(points_possible_soup.text[3:])
                        else:
                            points_possible = None

                        assignment = {"date": date, "time": time, "category": category_name,
                                      "assignment_name": assignment_name, "points_possible": points_possible,
                                      "points_gotten": points_gotten,
                                      "psaid": assignment_id, 'sort_date': sort_date}

                        grades.append(assignment)

            if len(grades) == 0:
                total_course_count -= 1
                self.message = 'Synced ' + str(scraped_course_count) + ' of ' + str(total_course_count) + ' courses...'
                self.progress = initial_progress + (max_progress - initial_progress) * scraped_course_count / (
                    1 if total_course_count == 0 else total_course_count)
                continue

            no_due_date = list(filter(lambda j: j['sort_date'] is None, grades))
            no_due_date.reverse()
            due_date = list(filter(lambda j: j['sort_date'] is not None, grades))
            grades = sorted(due_date, key=lambda j: j['sort_date'], reverse=False)
            [grades.insert(0, item) for item in no_due_date]
            grades = [{key: value for key, value in assignment.items() if key != 'sort_date'} for assignment in grades]
            all_classes.append(BasisClassGrade(class_name, overall_grade, grades).as_dict)
            scraped_course_count += 1
            self.message = 'Synced ' + str(scraped_course_count) + ' of ' + str(total_course_count) + ' courses...'
            self.progress = initial_progress + (max_progress - initial_progress) * scraped_course_count / (
                1 if total_course_count == 0 else total_course_count)

        if term is not None:
            self.message = 'Sync Complete!'
            print(json_format(True, {term: {"_": all_classes}}, {term: {"_": weights.as_list}}))
        else:
            print(json_format(False, "No class data."))


if __name__ == "__main__":
    school: str = sys.argv[1]
    user: str = sys.argv[2]
    password: str = sys.argv[3]
    if school == "basis":
        bs = BasisScraper()
        try:
            if bs.login(user, password):
                bs.get_present()
        except requests.Timeout:
            print(json_format(False, "Could not connect to Schoology."))
        except Exception as e:
            # Error when something in PowerSchool breaks scraper
            print(json_format(False, "An Unknown Error occurred. Contact support."))
            # Uncomment below to print error
            # print(e)
    else:
        data_if_locked: dict = json.loads(sys.argv[4])  # arg must be stringified json
        term_data_if_locked: dict = json.loads(sys.argv[5])  # arg must be stringified json
        get_history: str = sys.argv[6]
        ps = PowerschoolScraper(school)
        try:
            if ps.login(user, password):
                if get_history in ['true', 'True', '1']:
                    ps.get_history()
                else:
                    ps.get_present()
            else:
                ps.get_locked(data_if_locked, term_data_if_locked)
        except requests.Timeout:
            print(json_format(False, "Could not connect to PowerSchool."))
        except Exception as e:
            # Error when something in PowerSchool breaks scraper
            print(json_format(False, "An Unknown Error occurred. Contact support."))
            # Uncomment below to print error
            # print(e)
