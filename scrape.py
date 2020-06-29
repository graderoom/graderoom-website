import json
import requests
import sys
from bs4 import BeautifulSoup as BS


def json_format(success, message_or_grades):
    """
    Args:
        success: boolean if scraping was successful
        message_or_grades: a message for errors or grade data in JSON format
        fail_grades: partial grades if error while scraping grades

    Returns:
        A JSON formatted object containing the response
    """

    if success:
        return json.dumps({'success': True, 'grades': message_or_grades})

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

    def add_grade(self, assignment_name, date, grade_percent, points_gotten,
                  points_possible, category, exclude):
        """Adds an assignment with its attributes to grades

        Args:
            assignment_name: String
            date: String
            grade_percent: Int
            points_gotten: Float
            points_possible: Float
            category: String
            exclude: Boolean
        """

        new_grade = {
            'assignment_name': assignment_name,
            'date': date,
            'category': category,
            'grade_percent': grade_percent,
            'points_gotten': points_gotten,
            'points_possible': points_possible,
            'exclude': exclude
        }

        self.grades.append(new_grade)

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
        resp = self.session.get(url, headers=headers_1)
        soup = BS(resp.text, "html.parser")
        samlr = soup.find("input", {'name': 'SAMLRequest'}).get('value')

        # Second request
        url = "https://federation.bcp.org/idp/SSO.saml2"
        data = {
            'RelayState': "/guardian/home.html",
            'SAMLRequest': samlr,
        }
        resp = self.session.post(url, data=data, headers=headers_2)
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
        resp = self.session.post(dynamic_url, data=data, headers=headers_3)
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
        resp = self.session.post(url, data=data, headers=headers_4)

    def get_history(self):
        """Uses a session to grab all available grade data on powerschool"""
        url = 'https://powerschool.bcp.org/guardian/termgrades.html'
        resp = self.session.get(url)
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
            resp = self.session.get(url + link['href'])
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
        resp = self.session.get(url)
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

        # Print out the result
        if not all_classes:
            print(json_format(False, "No class data."))
        else:
            print(json_format(True, all_classes))

    def scrape_class(self, url, all_classes, overall_percent, overall_letter):
        """Scrapes data from a class assignments page
        Args:
            url: String of the page to scrape
            all_classes: List that assignments will be added to
            overall_percent: Float
            overall_letter: Float
        """
        grades_resp = self.session.get(url)
        grades_soup = BS(grades_resp.text, 'html.parser')

        # The two tables in the page. info is top, grades is bottom
        class_tables = grades_soup.find_all('table')
        info_table = class_tables[0]
        grades_table = class_tables[1]

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

        # Get grade and name data for each assignment
        grade_rows = grades_table.find_all('tr')
        for grade_row in grade_rows:
            grade_data = grade_row.find_all('td')

            # Skip table header
            if grade_data == [] or len(grade_data) < 10:
                continue

            date = grade_data[0].text
            category = grade_data[1].text
            assignment_name = grade_data[2].text
            exclude = False

            # Check if either exclude flag exists
            if len(grade_data[6]) == 1 or len(grade_data[7]) == 1:
                exclude = True

            score = grade_data[8].text
            # Check cases for if the score does not have a grade
            try:
                # When it is extra credit (ex. 5)
                points_possible = 0
                points_gotten = float(score)
            except Exception:
                if score.find('/') == -1:
                    # When it is extra credit (same as above?)
                    points_possible = False
                    points_gotten = False
                elif score.split('/')[0] == '--':
                    # When no grade is present (ex. --/100)
                    points_possible = float(score.split('/')[1])
                    points_gotten = False
                else:
                    # When it is normal (ex. 90/100)
                    points_possible = float(score.split('/')[1])
                    points_gotten = float(score.split('/')[0])

            # Get the percent for the assignment
            if points_possible and points_possible and points_gotten:
                grade_percent = grade_data[9].text
                grade_percent = self.clean_number(grade_percent)
            else:
                grade_percent = False

            # Add the assignment to the ClassGrade object
            local_class.add_grade(assignment_name, date, grade_percent,
                                  points_gotten, points_possible,
                                  category, exclude)
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
    except Exception as e:
        # Error when something in PowerSchool breaks scraper
        print(json_format(False, "Error scraping grades."))
        # Uncomment below to print error
        # print(e)