import json
import requests
import sys
from bs4 import BeautifulSoup as BS


def json_format(success, message_or_grades, fail_grades=[]):
    """
    Args:
        :param success: boolean if scraping was successful
        :param message_or_grades: a message for errors or grade data in JSON format
        :param fail_grades: partial grades if error while scraping grades

    Returns:
        A JSON formatted object containing the response
    """

    if success:
        return json.dumps({'success': True, 'grades': message_or_grades})

    return json.dumps({'success': False, 'message': message_or_grades, 'grades': fail_grades})


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

    def __init__(self, email, password):
        """Inits with credentials and creates a session"""
        self.email = email
        self.password = password
        self.session = requests.Session()
        self.intermediate_class_data = []

    def login_and_get_all_class_grades_and_print_resp(self):
        """Scrapes grade data from PowerSchool and prints it

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
            # This will be changed to the dynamic URL
            'Referer': 'CHANGE_THIS',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'
        }

        # First request
        url = "https://powerschool.bcp.org/guardian/home.html"
        resp_1 = self.session.get(url, headers=headers_1)
        soup_1 = BS(resp_1.text, "html.parser")
        samlr_1 = soup_1.find("input", {'name': 'SAMLRequest'}).get('value')

        # Second request
        url_2 = "https://federation.bcp.org/idp/SSO.saml2"
        data_2 = {
            'RelayState': "/guardian/home.html",
            'SAMLRequest': samlr_1,
        }
        resp_2 = self.session.post(url_2, data=data_2, headers=headers_2)
        soup_2 = BS(resp_2.text, "html.parser")
        dynamic_url = soup_2.find("form", id='ping-login-form').get('action')

        # Third request
        dynamic_url = "https://federation.bcp.org" + dynamic_url
        data_3 = {
            'pf.ok': '',
            'pf.cancel': '',
            'pf.username': self.email,
            'pf.pass': self.password,
        }
        resp_3 = self.session.post(dynamic_url, data=data_3, headers=headers_3)
        soup_3 = BS(resp_3.text, "html.parser")

        # If response is not found, authentication failed (incorrect login)
        samlr_3_ref = soup_3.find("input", {'name': 'SAMLResponse'})
        if samlr_3_ref is None:
            print(json_format(False, "Incorrect login details."))
            return

        # Fourth request
        url_4 = 'https://powerschool.bcp.org:443/saml/SSO/alias/pslive'
        samlr_4 = samlr_3_ref.get('value')
        headers_4['Referer'] = dynamic_url
        data_4 = {
            'SAMLResponse': samlr_4,
            'RelayState': "/guardian/home.html",
        }
        # Manually add cookie
        jsession = self.session.cookies.get_dict()['JSESSIONID']
        headers_4['Cookie'] = "JSESSIONID=" + jsession
        resp_4 = self.session.post(url_4, data=data_4, headers=headers_4)


        # Begin organizing response data
        final_all_classes = []

        # Main table on PowerSchool Page
        soup_resp = BS(resp_4.text, "html.parser")
        main_table = soup_resp.find("table", {'class': 'linkDescList grid'})

        # Get only the rows of classes from the table
        main_table_rows = main_table.findChildren("tr", recursive=False)
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
            links = class_row.findChildren("a", recursive=True)
            for link in links:
                # If an overall grade is present, the link text is bold
                # If no grade is present, then it is [ i ]
                # Finally, check if it is actually a class grade link
                if ((link.has_attr('class') and link['class'] == ['bold'])
                    or link.text == '[ i ]') and link['href'][:5] == 'score':

                    assignments_link = link['href']

                    # Split combined letter grade and percent text
                    # into two separate values
                    letter_and_percent = link.text
                    if link.text == '[ i ]':
                        overall_letter = '-'
                        overall_percent = -1
                    else:
                        for i, charac in enumerate(letter_and_percent):
                            if str.isdigit(charac):
                                overall_letter = letter_and_percent[:i]
                                overall_percent = float(letter_and_percent[i:])
                                break

            # Ensure link for assignments exists
            if assignments_link is None:
                continue

            # Scrape data from assignments page
            url = 'https://powerschool.bcp.org/guardian/'
            grades_resp = self.session.get(url + assignments_link)

            grades_soup = BS(grades_resp.text, 'html.parser')

            # The two tables in the page. info is top, grades is bottom
            class_tables = grades_soup.findChildren('table')
            info_table = class_tables[0]
            grades_table = class_tables[1]

            # Get teacher and class name
            info_row = info_table.findChildren('tr')[1]
            info_data = info_row.findChildren('td')
            class_name = info_data[0].text
            teacher_name = info_data[1].text

            # Create a ClassGrade object to hold assignment data
            # Ensure all data is present, otherwise skip the class
            if (class_name and teacher_name and overall_percent
                and (overall_letter != '-')):
                local_class = ClassGrade(class_name, teacher_name,
                                         overall_percent, overall_letter)
            else:
                continue

            # Add class name to intermediate_class_data
            self.intermediate_class_data.append('CLASS_NAME ' + class_name)

            # Get grade and name data for each assignment
            grades_rows = grades_table.findChildren('tr')
            for grade_row in grades_rows:
                grade_data = grade_row.findChildren('td')

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
                    points_possible = 0
                    points_gotten = float(score)
                except Exception:
                    if score.find('/') == -1:
                        points_possible = False
                        points_gotten = False
                    elif score.split('/')[0] == '--':
                        points_possible = float(score.split('/')[1])
                        points_gotten = False
                    else:
                        points_possible = float(score.split('/')[1])
                        points_gotten = float(score.split('/')[0])

                # Get the percent for the assignment
                if points_possible != 0 and points_possible != False and points_gotten != False:
                    grade_percent = grade_data[9].text
                else:
                    grade_percent = -1

                # Add the assignment to the ClassGrade object
                local_class.add_grade(assignment_name, date, grade_percent,
                                      points_gotten, points_possible,
                                      category, exclude)

                # Add assignment name to intermediate_class_data
                self.intermediate_class_data.append(assignment_name)

            final_all_classes.append(local_class.as_dict())

        # Print out the result
        if not final_all_classes:
            print(json_format(False, "No class data."))
        else:
            pass
            print(json_format(True, final_all_classes))

if __name__ == "__main__":
    user = sys.argv[1]
    password = sys.argv[2]
    ps = PowerschoolScraper(user, password)
    ### DEBUG ###
    # user = ""
    # password = ""
    ### DEBUG ###
    try:
        ps.login_and_get_all_class_grades_and_print_resp()
    except Exception:
        # send class data in the event of something in Powerschool breaking scraper
        print(json_format(False, "Error scraping grades.", ps.intermediate_class_data))
