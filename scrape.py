import requests
from bs4 import BeautifulSoup as BS
import getpass

url = "https://powerschool.bcp.org/guardian/home.html"

sesh = requests.Session()

master_headers = {
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

master_headers_2 = {
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
	'Referer': 'CHANGE_THIS',
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

r = sesh.get(url, headers = master_headers)
soup = BS(r.text, "html.parser")
# print(r.text)
print(sesh.cookies)
print('1st request result: should have cookie: JSESSION.')

input("any key to continue")

samlr = soup.find("input", {'name': 'SAMLRequest'}).get('value')
print("First samlr:" + samlr )

url_3 = "https://federation.bcp.org/idp/SSO.saml2"


data = {
	'RelayState':"/guardian/home.html",
	'SAMLRequest': samlr,
}

res = sesh.post(url_3, data = data, headers = master_headers_2)

print(res.text)
print(sesh.cookies)
print("^ should now have PF cookie")


soup2 = BS(res.text, "html.parser")
url_4  = soup2.find("form", id = 'ping-login-form').get('action')

print(url_4)
url_5 = "https://federation.bcp.org" + url_4
print("post url:"+ url_5)

passw = getpass.getpass(prompt='Password: ', stream=None) 

dat2 = {
	'pf.ok': '',
	'pf.cancel': '',
	'pf.username': 'robert.ganino20@bcp.org',
	'pf.pass': passw,
}
print("BEFORE:" +  str(sesh.cookies))
resp3 = sesh.post(url_5, data= dat2, headers = sso_ping_no_two_headers)
print("AFTER:" +  str(sesh.cookies))

print(resp3.status_code)
print(resp3.text)

input("above should say: ince your browser does not support JavaScript, you must press the Resume button once t")

url_10 = 'https://powerschool.bcp.org:443/saml/SSO/alias/pslive'

soup_3 = BS(resp3.text, "html.parser")

samlr = soup_3.find("input", {'name': 'SAMLResponse'}).get('value')
print("BIG SAMLResponse:" + samlr)

data = {
	'SAMLResponse': samlr,
	'RelayState':"/guardian/home.html",
}

headers_3['Referer'] = url_5
#manully add cookie

jsesh = sesh.cookies.get_dict()['JSESSIONID']

headers_3['Cookie'] = "JSESSIONID=" + jsesh

print(headers_3)

res_6 = sesh.post(url_10, data = data, headers = headers_3)

print(res_6.headers)
print(res_6.status_code)
print(res_6.text)
print(res_6.url)

print(sesh.cookies)


