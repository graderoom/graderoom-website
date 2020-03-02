import json
import requests
import sys
from bs4 import BeautifulSoup as BS


def json_format(success, message_or_grades):
    """Returns a message for errors or grade data in JSON format

    Args:
        success: boolean if scraping was successful
        message_or_grades: response or grade data

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

    def add_grade(self, assignment_name, date, grade_percent, points_gotten, points_possible, category, exclude):
        """Adds an assignment with its attributes to grades"""
        # TODO: Add functionality to add assignment without a grade
        new_grade = {
            'assignment_name': assignment_name, # String
            'date': date, # String
            'category': category, # String
            'grade_percent': grade_percent, # Double
            'points_gotten': points_gotten, # Double
            'points_possible': points_possible, # Double
            'exclude': exclude # Boolean
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
    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.sesh = requests.Session()

    def login_and_get_all_class_grades_and_print_resp(self):

        # Authenticates via SAML; see https://developers.onelogin.com/saml

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
            'Host': 'powerschool.bcp.org',
            'Origin': 'https://federation.bcp.org',
            'Referer': 'CHANGE_THIS',  # change to the dynamic url
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'

        }

        sso_ping_no_two_headers = {
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

        url = "https://powerschool.bcp.org/guardian/home.html"  # get a cookie and intial saml request token
        resp_1 = self.sesh.get(url, headers=headers_1)
        soup = BS(resp_1.text, "html.parser")
        samlr = soup.find("input", {'name': 'SAMLRequest'}).get('value')

        url_2 = "https://federation.bcp.org/idp/SSO.saml2"
        data = {
            'RelayState': "/guardian/home.html",
            'SAMLRequest': samlr,
        }
        resp_2 = self.sesh.post(url_2, data=data, headers=headers_2)

        soup2 = BS(resp_2.text, "html.parser")
        dynamic_url_half = soup2.find("form", id='ping-login-form').get('action')

        url_3 = "https://federation.bcp.org" + dynamic_url_half

        dat2 = {
            'pf.ok': '',
            'pf.cancel': '',
            'pf.username': self.email,
            'pf.pass': self.password,
        }
        resp_3 = self.sesh.post(url_3, data=dat2, headers=sso_ping_no_two_headers)

        url_4 = 'https://powerschool.bcp.org:443/saml/SSO/alias/pslive'
        soup_3 = BS(resp_3.text, "html.parser")

        # if this is not found, authentication failed (incorrect login)
        samlr_ref = soup_3.find("input", {'name': 'SAMLResponse'})
        if samlr_ref is None:
            # failed login
            print(json_format(False, "Incorrect login details."))
            return

        samlr = samlr_ref.get('value')

        data = {
            'SAMLResponse': samlr,
            'RelayState': "/guardian/home.html",
        }

        headers_3['Referer'] = url_3
        # manully add cookie

        jsesh = self.sesh.cookies.get_dict()['JSESSIONID']
        headers_3['Cookie'] = "JSESSIONID=" + jsesh  # todo figure out best way to store this for later use
        self.resp_4 = self.sesh.post(url_4, data=data, headers=headers_3)
        #         print("Added resp_4 to class data.")

        # print(self.resp_4.text)
        # powerschool home page ^!
        soup_test = BS(self.resp_4.text, "html.parser")
        table = soup_test.find("table", {'class': 'linkDescList grid'})

        tr_s = table.findChildren("tr", recursive=False)
        rows = []
        # print(tr_s)
        for maybe_row in tr_s:
            # print(maybe_row.attrs)
            if maybe_row.has_attr('class') and maybe_row['class'] == ['center']:
                rows.append(maybe_row)
        # print('\n' + str(rows))
        final_all_classes = []

        for actual_row in rows:

            local_class = None

            link_to_assignments = None
            class_name = None
            teacher_name = None
            overall_percent = None
            overall_letter = None

            # find overall grade + link to full assignments page
            aas = actual_row.findChildren("a", recursive=True)
            # print('\n' + str(aas))
            for link in aas:
                if ((link.has_attr('class') and link['class'] == ['bold']) or link.text == '[ i ]') and link['href'][
                                                                                                        :5] == 'score':
                    # todo this is hacky . fix ^ (the last check)
                    # print(link)
                    letter_percent_combined = link.text

                    if link.text == '[ i ]':
                        overall_letter = '-'
                        overall_percent = -1

                    else:

                        split_point = None
                        for indx, charac in enumerate(letter_percent_combined):
                            if str.isdigit(charac):
                                split_point = indx
                                break

                        overall_letter = letter_percent_combined[:split_point]
                        # print(overall_letter)
                        overall_percent = float(letter_percent_combined[split_point:])
                    # print(overall_percent)

                    link_to_assignments = link['href']
                # print(link_to_assignments)

            # find class name + teacher name
            tds = actual_row.findChildren("td", recursive=False)
            for td in tds:
                if td.has_attr('align') and td['align'] == 'left':
                    text_2 = td.text.replace('\xa0', '')  # wacky html character
                    split_text = text_2.split('Details about ')
                    class_name = split_text[0]  # will break with classes named Details about :[
                    teacher_name = (split_text[1]).split('Email')[0]  # will break with teachers named Email :[
                # print(teacher_name)
                # print(class_name)

            # dont add stuff (yet) unless all elements are present
            if class_name and teacher_name and overall_percent and (overall_letter != '-'):
                local_class = ClassGrade(class_name, teacher_name, overall_percent, overall_letter)
            else:
                continue

            # add grades
            if link_to_assignments is None:
                break  # homeroom triggered this
            grades_resp = self.sesh.get('https://powerschool.bcp.org/guardian/' + link_to_assignments)
            # TODO GET grade weights!

            grades_soup = BS(grades_resp.text, 'html.parser')
            g_table = grades_soup.find('table', {'border': '0'}, class_=lambda x: x != 'linkDescList')
            # print(g_table)
            # for g_row in g

            tr_gs = g_table.findChildren('tr')
            # print(tr_gs)

            for tr in tr_gs:
                td_gs = tr.findChildren('td')
                # print(td_gs)
                if td_gs == [] or len(td_gs) < 10:  # table header
                    continue  # TODO ensure this cont inner for loop

                # print(td_gs)
                # for g in td_gs:
                # todo maybe dont make this hard coded
                date = td_gs[0].text  # TODO parse date?
                cat = td_gs[1].text
                a_n = td_gs[2].text
                exclude = False

                # Check if either exclude flag exists
                if len(td_gs[6]) == 1 or len(td_gs[7]) == 1:
                    exclude = True

                temp = td_gs[8].text
                try:
                    if ('/' not in temp and temp != '--'):
                        pp = 0
                        pg = float(temp)
                    else:
                        pp = float(temp.split('/')[1])
                        pg = float(temp.split('/')[0])
                except:
                    #                    print(temp)
                    #                    print('Found empty/non graded assignment. Skipping')
                    continue
                if (pp != 0):
                    gp = td_gs[9].text
                else:
                    gp = -1
                local_class.add_grade(a_n, date, gp, pg, pp, cat, exclude)

            # todo check if local_class is good /complete enough
            final_all_classes.append(local_class.as_dict())

        #         print("Found classes for " + self.email + "!")
        #         for cla in final_all_classes:
        #             print(cla)
        #         print('--------------------')
        if final_all_classes == []:
            print(json_format(False, "No class data."))
        else:
            print(json_format(True, final_all_classes))  # list to send
    # TODO add more login checks


if __name__ == "__main__":
    try:
        user = sys.argv[1]
        password = sys.argv[2]
        ### DEBUG ###
        # user = ""
        # password = ""
        ### DEBUG ###
        ps = PowerschoolScraper(user, password)
        ps.login_and_get_all_class_grades_and_print_resp()
    except Exception:
        print(json_format(False, "Error scraping grades."))
