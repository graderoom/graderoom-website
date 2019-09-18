import requests
from bs4 import BeautifulSoup as BS
import getpass

class PowerschoolScraper:
	def __init__(self, email, password):
		self.email = email
		self.password = password
		self.sesh = requests.Session()

	def login(self):

		#Authenticates via SAML; see https://developers.onelogin.com/saml

		# for logging in
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

		#for logging in part 2
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

		# for logging in part 3
		headers_3 = {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
			'Accept-Encoding': 'gzip, deflate, br',
			'Accept-Language': 'en-US,en;q=0.9',
			'Cache-Control': 'max-age=0',
			'Connection': 'keep-alive',
			'Content-Type': 'application/x-www-form-urlencoded',
			'Host': 'powerschool.bcp.org',
			'Origin': 'https://federation.bcp.org',
			'Referer': 'CHANGE_THIS', #change to the dynamic url
			'Sec-Fetch-Mode': 'navigate',
			'Sec-Fetch-Site': 'same-site',
			'Sec-Fetch-User': '?1',
			'Upgrade-Insecure-Requests': '1',
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'

		}
		# for logging in part 4
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
		
		url = "https://powerschool.bcp.org/guardian/home.html" # get a cookie and intial saml request token
		r = self.sesh.get(url, headers = headers_1)
		soup = BS(r.text, "html.parser")
		# print(r.text)
		#todo remove all print /pause statements
		print(self.sesh.cookies)
		print('1st request result: should have cookie: JSESSION.')

		input("any key to continue")

		samlr = soup.find("input", {'name': 'SAMLRequest'}).get('value')
		print("First samlr:" + samlr ) #todo remove

		url_3 = "https://federation.bcp.org/idp/SSO.saml2"
		data = {
			'RelayState':"/guardian/home.html",
			'SAMLRequest': samlr,
		}

		res = self.sesh.post(url_3, data = data, headers = headers_2)

		#todo remove
		print(self.sesh.cookies)
		print("^ should now have PF cookie")


		soup2 = BS(res.text, "html.parser")
		url_4  = soup2.find("form", id = 'ping-login-form').get('action')

		url_5 = "https://federation.bcp.org" + url_4
		print("post url:"+ url_5)

		dat2 = {
			'pf.ok': '',
			'pf.cancel': '',
			'pf.username': self.email,
			'pf.pass': self.password,
		}

		resp3 = self.sesh.post(url_5, data= dat2, headers = sso_ping_no_two_headers)

		#todo remove
		print(resp3.status_code)
		#print(resp3.text)
		input("above should say: ince your browser does not support JavaScript, you must press the Resume button once t")

		url_10 = 'https://powerschool.bcp.org:443/saml/SSO/alias/pslive'

		soup_3 = BS(resp3.text, "html.parser")

		#todo if this is not found, authentication failed (incorrect login)
		samlr = soup_3.find("input", {'name': 'SAMLResponse'}).get('value')
		print("BIG SAMLResponse:" + samlr)

		data = {
			'SAMLResponse': samlr,
			'RelayState':"/guardian/home.html",
		}

		headers_3['Referer'] = url_5
		#manully add cookie

		jsesh = self.sesh.cookies.get_dict()['JSESSIONID']

		headers_3['Cookie'] = "JSESSIONID=" + jsesh #todo figure out best way to store this for later use

		res_6 = self.sesh.post(url_10, data = data, headers = headers_3)

		#todo remove
		print(res_6.headers)
		print(res_6.status_code)
		print(res_6.text)
		print(res_6.url) #todo if login fails; url = https://powerschool.bcp.org/samlsp/authenticationexception.action?error_type=AUTHENTICATION_EXCEPTION
		print(self.sesh.cookies)

		
if __name__ == "__main__":
	ps = PowerschoolScraper('user', 'pass')
	ps.login()