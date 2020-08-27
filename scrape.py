import json
import requests
import sys
from bs4 import BeautifulSoup as BS


def json_format(success, message_or_grades):
    """
    Args:
        success: boolean if scraping was successful
        message_or_grades: a message for errors or grade data in JSON format

    Returns:
        A JSON formatted response
    """

    if success:
        return json.dumps({'success': True, 'new_grades': message_or_grades})

    return json.dumps({'success': False, 'message': message_or_grades})


class ClassGrade:
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
        grades: list of dictionaries of individual assignments
    """

    def __init__(self, class_name, teacher_name, overall_percent, overall_letter):
        """Inits ClassGrade with PowerSchool class information"""
        self.class_name = class_name
        self.teacher_name = teacher_name
        self.overall_percent = overall_percent
        self.overall_letter = overall_letter
        self.grades = []

    def as_dict(self):
        """Returns ClassGrade object as a formatted dictionary"""
        return {
            'class_name': self.class_name,
            'teacher_name': self.teacher_name,
            'overall_percent': self.overall_percent,
            'overall_letter': self.overall_letter,
            'grades': self.grades
        }


class PowerschoolScraper:
    """Scrapes grade data from PowerSchool

    Using provided Bellarmine credentials, it logs into
    PowerSchool and scrapes grade and class data,
    then prints it in a JSON format.

    Attributes:
        email: string
        password: string
        session: requests session object
    """

    def __init__(self):
        """Inits with a session"""
        self.session = requests.Session()

    def clean_string(self, s):
        """javadoc"""
        s = s.strip()
        if s == "":
            return False
        return s

    def clean_number(self, n):
        """javadoc"""
        n = n.strip()
        try:
            n = float(n)
            return n
        except:
            return False

    def login(self, email, password):
        """Logs into PowerSchool with credentials, then prints grades

        Session is stored in instance variable.
        Authenticates via SAML
        See https://developers.onelogin.com/saml
        """
        # Various headers required for logging in
        headers_1 = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
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
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'
        }

        headers_2 = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
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
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'
        }

        headers_3 = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
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
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'
        }

        headers_4 = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
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
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'
        }

        # First request
        url = "https://powerschool.bcp.org/guardian/home.html"
        resp = self.session.get(url, headers=headers_1, timeout=10)
        soup = BS(resp.text, "html.parser")
        samlr = soup.find("input", {'name': 'SAMLRequest'}).get('value')

        # Second request
        url = "https://federation.bcp.org/idp/SSO.saml2"
        data = {
            'RelayState': "/guardian/home.html",
            'SAMLRequest': samlr,
        }
        resp = self.session.post(url, data=data, headers=headers_2, timeout=10)
        soup = BS(resp.text, "html.parser")
        dynamic_url = soup.find("form", id='ping-login-form').get('action')

        # Third request
        dynamic_url = "https://federation.bcp.org" + dynamic_url
        data = {
            'pf.ok': '',
            'pf.cancel': '',
            'pf.username': email,
            'pf.pass': password,
        }
        resp = self.session.post(dynamic_url, data=data, headers=headers_3,
                                 timeout=10)
        soup = BS(resp.text, "html.parser")

        # If no response, authentication failed (incorrect login)
        samlr = soup.find("input", {'name': 'SAMLResponse'})
        if samlr is None:
            print(json_format(False, "Incorrect login details."))
            return

        # Fourth request
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
        resp = self.session.post(url, data=data, headers=headers_4, timeout=10)

        # Check if PowerSchool is locked
        url = 'https://powerschool.bcp.org/guardian/home.html'
        resp = self.session.get(url, timeout=10)
        soup_resp = BS(resp.text, "html.parser")
        table = soup_resp.find("table")
        if not table:
            print(json_format(False, "PowerSchool is locked"))
            sys.exit()


    def get_history(self):
        """Uses a session to grab all available grade data on powerschool"""
        url = 'https://powerschool.bcp.org/guardian/termgrades.html'
        resp = self.session.get(url, timeout=10)
        soup_resp = BS(resp.text, "html.parser")

        # Begin organizing response data
        all_history = {}

        # Locate links of past years
        year_list = soup_resp.find("ul", class_='tabs')
        year_links = year_list.find_all("li")

        for year_link in year_links:
            # Exclude summer school pages by checking for SS in title
            # since they show duplicate data
            link = year_link.find("a")
            if "SS" in str(link):
                continue

            # Cut the year from the link text
            year = year_link.text[:5]

            # Ensure it exists, then fetch the year link
            if not link['href']:
                continue
            url = 'https://powerschool.bcp.org/guardian/'
            resp = self.session.get(url + link['href'], timeout=10)
            soup_resp = BS(resp.text, "html.parser")

            # Begin parsing data
            main_table = soup_resp.find("table")
            main_table_rows = main_table.find_all("tr")

            title = ""
            semester_classes = []
            year_data = {}
            for row in main_table_rows:
                # Identify what semester we are under
                th = row.find("th")
                if th and th.text in ["S0", "S1", "S2"]:
                    if semester_classes:
                        # Add data when all classes for a semester
                        # have been scraped
                        year_data[title] = semester_classes
                    # Reset for a new semester
                    title = th.text
                    semester_classes = []

                # Check if the current row has class data
                if title and row.find("td", align="left"):
                    data = row.find_all("td")

                    class_name = self.clean_string(data[0].text)
                    overall_letter = self.clean_string(data[1].text)
                    overall_percent = self.clean_number(data[2].text)

                    # Scrape links that lead to assignments
                    if row.find("a"):
                        url = "https://powerschool.bcp.org/guardian/"
                        url = url + row.find("a").get('href')
                        self.scrape_class(url, semester_classes,
                                          overall_percent,
                                          overall_letter)
                    else:
                        local_class = ClassGrade(class_name, False,
                                                 overall_percent,
                                                 overall_letter)
                        semester_classes.append(local_class.as_dict())
            # Finalize data for the selected year
            year_data[title] = semester_classes
            all_history[year] = year_data

        if not all_history:
            print(json_format(False, "No class data."))
        else:
            print(json_format(True, all_history))

    def get_present(self):
        """Uses a session to grab current semester grade data"""
        url = 'https://powerschool.bcp.org/guardian/home.html'
        resp = self.session.get(url, timeout=10)
        soup_resp = BS(resp.text, "html.parser")

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
                if ((link.has_attr('class') and link['class'] == ['bold'])
                    or link.text == '[ i ]') and link['href'][:5] == 'score':

                    assignments_link = link['href']

                    # Split combined letter grade and percent text
                    # into two separate values
                    letter_and_percent = link.text
                    if link.text == '[ i ]':
                        overall_letter = '-'
                        overall_percent = False
                    else:
                        for i, charac in enumerate(letter_and_percent):
                            if str.isdigit(charac):
                                overall_letter = letter_and_percent[:i]
                                overall_percent = float(letter_and_percent[i:])
                                break

            # Ensure link for assignments exists
            if assignments_link is None:
                continue

            url = 'https://powerschool.bcp.org/guardian/'
            url = url + assignments_link
            self.scrape_class(url, all_classes, overall_percent,
                              overall_letter)

        # Fetch the current term and semester
        url = 'https://powerschool.bcp.org/guardian/myschedulematrix.html'
        resp = self.session.get(url, timeout=10)
        soup_resp = BS(resp.text, "html.parser")

        main_table = soup_resp.find("table")
        table_cells = main_table.find_all("td")
        term = table_cells[1].text
        semester = table_cells[2].text

        if term == None or semester == None:
            raise Exception("Error getting term and semester data")

        # Print out the result
        if not all_classes:
            print(json_format(False, "No class data."))
        else:
            # Add term and semester to the data
            all_classes = {term: {semester: all_classes}}
            print(json_format(True, all_classes))

    def scrape_class(self, url, all_classes, overall_percent, overall_letter):
        """Scrapes data from a class assignments page
        Args:
            url: String of the page to scrape
            all_classes: List that assignments will be added to
            overall_percent: Float
            overall_letter: Float
        """
        grades_resp = self.session.get(url, timeout=10)
        grades_soup = BS(grades_resp.text, 'html.parser')

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
        if (class_name and teacher_name and overall_percent
            and (overall_letter != '-')):
            local_class = ClassGrade(class_name, teacher_name,
                                     overall_percent, overall_letter)
        else:
            return

        # Get the Section ID for a class
        wrapper = grades_soup.find('div', class_='xteContentWrapper')
        section_id = wrapper.find('div')['data-sectionid']

        # Get the Student ID for a class
        student_id = wrapper['data-ng-init'].split(';')[0].split("'")[1][3:]

        headers = {
            'Connection': 'keep-alive',
            'authority': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36',
            'Content-Type': 'application/json;charset=UTF-8',
            'Origin': 'https://powerschool.bcp.org',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'Referer': url,
            'Accept-Language': 'en-US,en;q=0.9',
        }

        params = (('_', ''),)

        data = '{"section_ids":[' + section_id + '],"student_ids":[' + student_id + '],"start_date":"2020-8-17","end_date":"2020-12-18"}'

        url = 'https://powerschool.bcp.org/ws/xte/assignment/lookup'
        response = self.session.post(url, headers=headers, params=params, data=data)

        # function that takes a Powerschool assignment object and returns a Graderoom assignment object
        def stripper(info):
            if not "_assignmentsections" in info: return False
            _data = info["_assignmentsections"][0]
            date = _data["duedate"].replace("-", "/")
            date = date[5:] + "/" + date[:4]
            category = _data["_assignmentcategoryassociations"][0]["_teachercategory"]["name"]
            assignment_name = _data["name"]
            exclude = not _data["iscountedinfinalgrade"]
            if "totalpointvalue" in _data and isinstance(_data["totalpointvalue"], (float, int)):
                points_possible = _data["totalpointvalue"]
            else:
                points_possible = False
            if len(_data["_assignmentscores"]) > 0:
                if "scorepoints" in _data["_assignmentscores"][0]:
                    points_gotten = _data["_assignmentscores"][0]["scorepoints"]
                else:
                    points_gotten = False
                if "scorepercent" in _data["_assignmentscores"][0]:
                    grade_percent = _data["_assignmentscores"][0]["scorepercent"]
                else:
                    grade_percent = False
            else:
                points_gotten = False
                grade_percent = False
            return {
                "date": date,
                "category": category,
                "assignment_name": assignment_name,
                "exclude": exclude,
                "points_possible": points_possible,
                "points_gotten": points_gotten,
                "grade_percent": grade_percent
            }

        # input
        raw = json.loads(response.text)

        # output
        local_class.grades = sorted(list(map(stripper, raw)), key=lambda i:i['date'])
        all_classes.append(local_class.as_dict())


if __name__ == "__main__":
    user = sys.argv[1]
    password = sys.argv[2]
    get_history = sys.argv[3]
    ps = PowerschoolScraper()
    try:
        ps.login(user, password)
        if get_history in ['true', 'True', '1']:
            ps.get_history()
        else:
            ps.get_present()
    except requests.Timeout:
        print(json_format(False, "Could not connect to PowerSchool"))
    except Exception as e:
        # Error when something in PowerSchool breaks scraper
        print(json_format(False, "Error scraping grades."))
        # Uncomment below to print error
        # print(e)
